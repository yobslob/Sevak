from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F
import requests
import os

from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

app = Flask(__name__)
CORS(app)

# Model name (used for local load attempt and as HF inference endpoint)
scam_model_name = "BothBosu/bert-agent-scam-classifier-v1.0"

# Try to load the local model (safe-guarded). If it fails, we'll use HF Inference API instead.
scam_tokenizer = None
scam_model = None
try:
    scam_tokenizer = AutoTokenizer.from_pretrained(scam_model_name)
    scam_model = AutoModelForSequenceClassification.from_pretrained(scam_model_name)
    print("Loaded local scam classifier model:", scam_model_name)
except Exception as e:
    scam_tokenizer = None
    scam_model = None
    print("Warning: could not load local scam classifier model. Falling back to Hugging Face Inference API.")
    print("Local load error:", e)

# Hugging Face Inference API settings
# We'll use the same HF token for both classification and generation calls.
HF_API_KEY = HF_TOKEN
hf_headers = {"Authorization": f"Bearer {HF_API_KEY}"} if HF_API_KEY else {}

# Build a classification API URL that points to the same model name (inference endpoint)
SCAM_API_URL = f"https://api-inference.huggingface.co/models/{scam_model_name}"

# Generation model (kept as in your original code)
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1"


@app.route('/classify', methods=['POST'])
def classify():
    data = request.get_json()
    conversation = data.get("conversation", "")

    if not conversation or not conversation.strip():
        return jsonify({"error": "Empty conversation"}), 400

    print("Input conversation:", conversation)

    # Keep only the most recent N lines to limit request size and model context
    lines = [ln for ln in conversation.strip().split('\n') if ln.strip()]
    last_n = 12
    relevant_lines = lines[-last_n:]
    # Strip speaker tags for classifier (e.g. "Caller: text" -> "text")
    cleaned_for_model = ' '.join([line.split(':', 1)[1].strip() for line in relevant_lines if ':' in line])

    # Defaults
    scam_prob = 0.0
    non_scam_prob = 1.0

    # If we have a local model loaded, use it (robust to logits shape)
    if scam_model is not None and scam_tokenizer is not None:
        try:
            inputs = scam_tokenizer(cleaned_for_model, return_tensors="pt", truncation=True, padding=True, max_length=512)
            with torch.no_grad():
                outputs = scam_model(**inputs)
                logits = outputs.logits

                if logits is None:
                    # Defensive fallback
                    print("Classifier: logits is None, falling back to 0.0 probability.")
                    scam_prob = 0.0
                    non_scam_prob = 1.0
                else:
                    # Handle two-logit softmax case
                    if logits.dim() == 2 and logits.size(1) == 2:
                        probs = F.softmax(logits, dim=1)[0].cpu().numpy()
                        # Try to use model config mapping if available to find which index means "scam"
                        id2label = getattr(scam_model.config, "id2label", None)
                        if id2label:
                            # Find index whose label string contains "scam" (best-effort)
                            scam_index = None
                            for idx, lab in id2label.items():
                                if isinstance(lab, str) and "scam" in lab.lower():
                                    scam_index = int(idx)
                                    break
                            if scam_index is None:
                                # fallback to index 1 (common)
                                scam_index = 1
                            scam_prob = float(probs[scam_index])
                            non_scam_prob = float(1.0 - scam_prob)
                        else:
                            # fallback to index 1 = scam (common pattern)
                            scam_prob = float(probs[1])
                            non_scam_prob = float(probs[0])
                    else:
                        # Single-logit / regression-style -> use sigmoid
                        try:
                            val = logits.squeeze().cpu()
                            prob = torch.sigmoid(val).item()
                            scam_prob = float(prob)
                            non_scam_prob = float(1.0 - prob)
                        except Exception as e:
                            print("Unexpected logits shape; error:", e)
                            scam_prob = 0.0
                            non_scam_prob = 1.0
        except Exception as e:
            print("Error during local model classification:", e)
            scam_prob = 0.0
            non_scam_prob = 1.0

    else:
        # Use Hugging Face Inference API for classification
        try:
            payload = {"inputs": cleaned_for_model}
            resp = requests.post(SCAM_API_URL, headers=hf_headers, json=payload, timeout=30)
            resp.raise_for_status()
            resp_data = resp.json()

            # Parse common HF formats
            parsed = False
            # Case: list of {label: "...", score: 0.123}
            if isinstance(resp_data, list) and len(resp_data) > 0 and isinstance(resp_data[0], dict):
                # Try to find a label that contains 'scam' (case-insensitive)
                scam_score = None
                for entry in resp_data:
                    label = str(entry.get("label", "")).lower()
                    score = entry.get("score", None)
                    if score is None:
                        continue
                    if "scam" in label or "fraud" in label:
                        scam_score = float(score)
                        break
                if scam_score is not None:
                    scam_prob = scam_score
                    non_scam_prob = 1.0 - scam_prob
                    parsed = True
                elif len(resp_data) == 2:
                    # fallback: assume second entry corresponds to positive/scam (best-effort)
                    try:
                        scam_prob = float(resp_data[1].get("score", 0.0))
                        non_scam_prob = float(resp_data[0].get("score", 1.0 - scam_prob))
                        parsed = True
                    except Exception:
                        pass
                else:
                    # If it's a single-entry list with a score, try using that
                    try:
                        scam_prob = float(resp_data[0].get("score", 0.0))
                        non_scam_prob = 1.0 - scam_prob
                        parsed = True
                    except Exception:
                        pass

            # Case: dict with label/score or other formats
            if not parsed and isinstance(resp_data, dict):
                # Common case: {"label": "...", "score": ...}
                if "label" in resp_data and "score" in resp_data:
                    label = str(resp_data.get("label", "")).lower()
                    score = float(resp_data.get("score", 0.0))
                    if "scam" in label or "fraud" in label:
                        scam_prob = score
                        non_scam_prob = 1.0 - scam_prob
                    else:
                        # If label doesn't mention scam, assume score is for the given label; treat it as spammy if high
                        scam_prob = score
                        non_scam_prob = 1.0 - scam_prob
                    parsed = True
                # Some HF models return {"scores": [...], "labels": [...]} style
                elif "scores" in resp_data and "labels" in resp_data:
                    labels = resp_data.get("labels", [])
                    scores = resp_data.get("scores", [])
                    scam_score = None
                    for lab, sc in zip(labels, scores):
                        if "scam" in str(lab).lower() or "fraud" in str(lab).lower():
                            scam_score = float(sc)
                            break
                    if scam_score is None and len(scores) >= 2:
                        scam_score = float(scores[1])
                    if scam_score is None and len(scores) == 1:
                        scam_score = float(scores[0])
                    if scam_score is not None:
                        scam_prob = scam_score
                        non_scam_prob = 1.0 - scam_prob
                        parsed = True

            if not parsed:
                # As a last resort, try to interpret a simple dict/list or fallback to conservative 0.0
                print("Warning: Unexpected classification response format from HF API:", resp_data)
                scam_prob = 0.0
                non_scam_prob = 1.0

        except Exception as e:
            print("Error calling HF classification API:", e)
            # Keep conservative defaults (non-scam)
            scam_prob = 0.0
            non_scam_prob = 1.0

    # Early exit if not enough lines for context (same behavior you had)
    if len(lines) < 6:
        return jsonify({
            "scam_probability": round(scam_prob, 4),
            "non_scam_probability": round(non_scam_prob, 4),
            "suggested_reply": ""
        })

    # Decide whether to produce a suggested reply or not
    suggested_reply = ""
    if scam_prob < 0.4:
        suggested_reply = "No Reply needed, it's likely a non-scam conversation."
    elif scam_prob > 0.65:
        suggested_reply = "No Reply needed, it's likely a scam."
    else:
        hf_prompt = f"""
        You are the Receiver in the following conversation:

        {conversation}

        Your goal is to politely and subtly challenge the Caller to help detect a potential scam.

        Ask a question that:
        - Requests specific info a real bank agent should know (e.g., last 4 digits of account).
        - Does NOT reveal any personal information.
        - Prompts the caller to prove their authenticity.

        Only output the reply sentence. Do NOT repeat the conversation.

        Reply:
        """
        try:
            hf_response = requests.post(
                HF_API_URL,
                headers=hf_headers,
                json={
                    "inputs": hf_prompt,
                    "parameters": {
                        "max_new_tokens": 50,
                        "temperature": 0.7,
                        "do_sample": True,
                        "top_p": 0.9,
                        "return_full_text": False
                    }
                },
                timeout=30
            )
            hf_response.raise_for_status()
            response_data = hf_response.json()

            # Parse generation response robustly
            raw_reply = None
            if isinstance(response_data, list) and len(response_data) > 0:
                # Common: [{'generated_text': '...'}]
                raw_reply = response_data[0].get("generated_text") or response_data[0].get("text") or None
            elif isinstance(response_data, dict):
                # Common: {'generated_text': '...'} or {'error': '...'}
                raw_reply = response_data.get("generated_text") or response_data.get("text") or None
                # Some APIs return {'generated_texts': [...]} or other variants
                if not raw_reply:
                    gen_texts = response_data.get("generated_texts") or response_data.get("generated") or None
                    if isinstance(gen_texts, list) and len(gen_texts) > 0:
                        raw_reply = gen_texts[0]
            if raw_reply:
                cleaned_reply = raw_reply.strip().replace('\n', ' ').strip()
                suggested_reply = cleaned_reply if cleaned_reply else ""
            else:
                # Could not parse reply — return empty suggestion but log for debugging
                print("Unexpected generation response format:", response_data)
                suggested_reply = ""
        except Exception as e:
            print("Hugging Face generation API error:", e)
            # Do not return exception text to the user; return empty suggestion so frontend can handle it
            suggested_reply = ""

    return jsonify({
        "scam_probability": round(scam_prob, 4),
        "non_scam_probability": round(non_scam_prob, 4),
        "suggested_reply": suggested_reply
    })


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    # Note: Keep debug True while you test locally; set to False in production if desired
    app.run(debug=True, host='0.0.0.0', port=port)