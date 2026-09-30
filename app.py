import os
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, render_template, jsonify
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)

# Load trained scikit-learn model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "Drug_classifier.joblib")
model = None

try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"Successfully loaded model from {MODEL_PATH}")
    else:
        print(f"Warning: Model file not found at {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model: {e}")

# Preset compounds with curated molecular descriptors
DRUG_PRESETS = {
    "aspirin": {
        "name": "Aspirin (Acetylsalicylic acid)",
        "formula": "C9H8O4",
        "category": "NSAID / Analgesic",
        "MolLogP": 1.31,
        "MolWt": 180.16,
        "NumRotatableBonds": 3.0,
        "AromaticProportion": 0.67
    },
    "caffeine": {
        "name": "Caffeine",
        "formula": "C8H10N4O2",
        "category": "CNS Stimulant",
        "MolLogP": -0.07,
        "MolWt": 194.19,
        "NumRotatableBonds": 0.0,
        "AromaticProportion": 0.64
    },
    "paracetamol": {
        "name": "Paracetamol (Acetaminophen)",
        "formula": "C8H9NO2",
        "category": "Analgesic / Antipyretic",
        "MolLogP": 0.46,
        "MolWt": 151.16,
        "NumRotatableBonds": 1.0,
        "AromaticProportion": 0.75
    },
    "ibuprofen": {
        "name": "Ibuprofen",
        "formula": "C13H18O2",
        "category": "NSAID",
        "MolLogP": 3.50,
        "MolWt": 206.28,
        "NumRotatableBonds": 4.0,
        "AromaticProportion": 0.46
    },
    "lipitor": {
        "name": "Lipitor (Atorvastatin)",
        "formula": "C33H35FN2O5",
        "category": "Statin / Lipid Lowering",
        "MolLogP": 5.36,
        "MolWt": 558.64,
        "NumRotatableBonds": 12.0,
        "AromaticProportion": 0.72
    },
    "metformin": {
        "name": "Metformin",
        "formula": "C4H11N5",
        "category": "Antidiabetic",
        "MolLogP": -1.43,
        "MolWt": 129.16,
        "NumRotatableBonds": 2.0,
        "AromaticProportion": 0.00
    }
}

def classify_solubility(log_s):
    """Categorizes logS solubility value according to Delaney standard scale."""
    if log_s > 0.0:
        return "Highly Soluble", "emerald", "Very high aqueous solubility (> 1.0 mol/L). Rapid oral absorption probable."
    elif log_s >= -2.0:
        return "Soluble", "cyan", "Good aqueous solubility (0.01 - 1.0 mol/L). Favorable for oral bioavailability."
    elif log_s >= -4.0:
        return "Moderately Soluble", "amber", "Moderate aqueous solubility (10⁻⁴ - 0.01 mol/L). May require formulation optimization."
    else:
        return "Poorly Soluble", "rose", "Low aqueous solubility (< 10⁻⁴ mol/L). High risk of bio-absorption bottlenecks."

def calculate_derived_metrics(mol_logp, mol_wt, num_rot_bonds, aromatic_prop, log_s):
    """Calculates concentration, Lipinski rules, and bioactivity metrics."""
    # Concentration in mol/L and g/L
    molar_conc = 10 ** log_s
    g_per_l = molar_conc * mol_wt
    mg_per_ml = g_per_l  # 1 g/L == 1 mg/mL

    # Lipinski rule evaluation (MW <= 500, LogP <= 5)
    mw_pass = mol_wt <= 500.0
    logp_pass = mol_logp <= 5.0
    passed_count = (1 if mw_pass else 0) + (1 if logp_pass else 0)

    sol_class, sol_color, sol_desc = classify_solubility(log_s)

    return {
        "logS": round(float(log_s), 4),
        "solubility_class": sol_class,
        "solubility_color": sol_color,
        "solubility_description": sol_desc,
        "molar_concentration": f"{molar_conc:.6e}",
        "concentration_g_per_l": round(float(g_per_l), 4),
        "concentration_mg_per_ml": round(float(mg_per_ml), 4),
        "lipinski": {
            "mw_pass": mw_pass,
            "logp_pass": logp_pass,
            "passed_rules": passed_count,
            "total_rules": 2,
            "status": "Fully Compliant" if passed_count == 2 else ("Partially Compliant" if passed_count == 1 else "Non-Compliant"),
            "status_color": "emerald" if passed_count == 2 else ("amber" if passed_count == 1 else "rose")
        },
        "normalized_radar": {
            "MolLogP": min(max((mol_logp + 5.0) / 15.0 * 100, 0), 100),
            "MolWt": min(max(mol_wt / 750.0 * 100, 0), 100),
            "NumRotatableBonds": min(max(num_rot_bonds / 15.0 * 100, 0), 100),
            "AromaticProportion": min(max(aromatic_prop * 100, 0), 100)
        }
    }

def predict_single(mol_logp, mol_wt, num_rot_bonds, aromatic_prop):
    """Performs inference using loaded scikit-learn model."""
    if model is None:
        raise ValueError("Model is not loaded on server.")
    features_df = pd.DataFrame(
        [[mol_logp, mol_wt, num_rot_bonds, aromatic_prop]],
        columns=["MolLogP", "MolWt", "NumRotatableBonds", "AromaticProportion"]
    )
    prediction_raw = model.predict(features_df)[0]
    return float(prediction_raw)

@app.route("/", methods=["GET", "POST"])
def home():
    """Renders main application UI."""
    initial_prediction = None
    form_data = {
        "MolLogP": 1.31,
        "MolWt": 180.16,
        "NumRotatableBonds": 3.0,
        "AromaticProportion": 0.67
    }
    
    if request.method == "POST":
        try:
            form_data["MolLogP"] = float(request.form.get("MolLogP", 1.31))
            form_data["MolWt"] = float(request.form.get("MolWt", 180.16))
            form_data["NumRotatableBonds"] = float(request.form.get("NumRotatableBonds", 3.0))
            form_data["AromaticProportion"] = float(request.form.get("AromaticProportion", 0.67))

            log_s = predict_single(
                form_data["MolLogP"],
                form_data["MolWt"],
                form_data["NumRotatableBonds"],
                form_data["AromaticProportion"]
            )
            initial_prediction = calculate_derived_metrics(
                form_data["MolLogP"],
                form_data["MolWt"],
                form_data["NumRotatableBonds"],
                form_data["AromaticProportion"],
                log_s
            )
        except Exception as e:
            initial_prediction = {"error": str(e)}

    return render_template("index.html", initial_prediction=initial_prediction, form_data=form_data)

@app.route("/api/predict", methods=["POST"])
def api_predict():
    """JSON API endpoint for single molecular descriptor prediction."""
    try:
        data = request.get_json() or request.form
        mol_logp = float(data.get("MolLogP", 0.0))
        mol_wt = float(data.get("MolWt", 0.0))
        num_rot_bonds = float(data.get("NumRotatableBonds", 0.0))
        aromatic_prop = float(data.get("AromaticProportion", 0.0))

        log_s = predict_single(mol_logp, mol_wt, num_rot_bonds, aromatic_prop)
        metrics = calculate_derived_metrics(mol_logp, mol_wt, num_rot_bonds, aromatic_prop, log_s)

        return jsonify({
            "success": True,
            "inputs": {
                "MolLogP": mol_logp,
                "MolWt": mol_wt,
                "NumRotatableBonds": num_rot_bonds,
                "AromaticProportion": aromatic_prop
            },
            "results": metrics
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route("/api/presets", methods=["GET"])
def api_presets():
    """Returns curated preset drugs with descriptor values."""
    return jsonify({"success": True, "presets": DRUG_PRESETS})

@app.route("/api/batch-predict", methods=["POST"])
def api_batch_predict():
    """Processes batch predictions from JSON array or uploaded CSV."""
    try:
        items = []
        if request.is_json:
            items = request.get_json().get("items", [])
        elif 'file' in request.files:
            file = request.files['file']
            df = pd.read_csv(file)
            items = df.to_dict(orient="records")
        
        results = []
        for index, item in enumerate(items):
            try:
                mol_logp = float(item.get("MolLogP", 0.0))
                mol_wt = float(item.get("MolWt", 0.0))
                num_rot_bonds = float(item.get("NumRotatableBonds", 0.0))
                aromatic_prop = float(item.get("AromaticProportion", 0.0))
                name = str(item.get("Name", f"Compound #{index + 1}"))

                log_s = predict_single(mol_logp, mol_wt, num_rot_bonds, aromatic_prop)
                metrics = calculate_derived_metrics(mol_logp, mol_wt, num_rot_bonds, aromatic_prop, log_s)
                results.append({
                    "id": index + 1,
                    "name": name,
                    "MolLogP": mol_logp,
                    "MolWt": mol_wt,
                    "NumRotatableBonds": num_rot_bonds,
                    "AromaticProportion": aromatic_prop,
                    "logS": metrics["logS"],
                    "solubility_class": metrics["solubility_class"],
                    "solubility_color": metrics["solubility_color"],
                    "concentration_g_per_l": metrics["concentration_g_per_l"],
                    "lipinski_status": metrics["lipinski"]["status"]
                })
            except Exception as item_err:
                results.append({
                    "id": index + 1,
                    "name": item.get("Name", f"Compound #{index + 1}"),
                    "error": str(item_err)
                })

        return jsonify({"success": True, "count": len(results), "results": results})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route("/api/model-info", methods=["GET"])
def api_model_info():
    """Returns technical information about the underlying ML model."""
    return jsonify({
        "success": True,
        "model_type": "RandomForestRegressor",
        "target_variable": "logS (Aqueous Solubility in log mol/L)",
        "dataset": "Delaney Solubility Dataset (ESOL)",
        "descriptors": [
            {"name": "MolLogP", "label": "Wildman-Crippen LogP", "min": -5.0, "max": 10.0, "step": 0.01, "default": 1.31, "unit": "log ratio"},
            {"name": "MolWt", "label": "Molecular Weight", "min": 10.0, "max": 800.0, "step": 0.1, "default": 180.16, "unit": "g/mol"},
            {"name": "NumRotatableBonds", "label": "Rotatable Bonds", "min": 0, "max": 20, "step": 1, "default": 3, "unit": "count"},
            {"name": "AromaticProportion", "label": "Aromatic Proportion", "min": 0.0, "max": 1.0, "step": 0.01, "default": 0.67, "unit": "ratio (0-1)"}
        ]
    })

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
