# Classify-D - Drug Solubility Classifier

**Classify-D** is a project-level web application and RESTful API built for predicting aqueous molecular solubility ($\text{logS}$) and evaluating drug-likeness bio-absorption metrics using scikit-learn machine learning models trained on the Delaney (ESOL) dataset.

---

## Key Features

- **Interactive Molecular Predictor**: Live dual range slider & numerical input controls for 4 key molecular descriptors:
  - `MolLogP` (Wildman-Crippen octanol-water partition coefficient)
  - `MolWt` (Molecular Weight in g/mol)
  - `NumRotatableBonds` (Count of rotatable single bonds)
  - `AromaticProportion` (Ratio of aromatic heavy atoms)
- **Reference Drug Presets**: One-click quick loading of popular pharmaceuticals (*Aspirin*, *Caffeine*, *Paracetamol*, *Ibuprofen*, *Lipitor*, *Metformin*).
- **Calculated Bio-Absorption Metrics**:
  - Solubility classification scale (*Highly Soluble*, *Soluble*, *Moderately Soluble*, *Poorly Soluble*)
  - Concentration calculations ($g/L$ and Molar solubility)
  - Lipinski's Rule of Five compliance checks (Molecular Weight $\le 500$, $\text{LogP} \le 5.0$)
- **Interactive Visualizations**: Dynamic Chart.js Descriptor Fingerprint Radar chart.
- **Batch CSV Analysis**: Upload molecular descriptor CSV files for bulk prediction scoring and export results to CSV.
- **RESTful API**: JSON endpoints (`/api/predict`, `/api/presets`, `/api/batch-predict`, `/api/model-info`).
- **Prediction History & Theme Control**: LocalStorage history management, export history, and dark/light theme toggling.

---

## Project Structure

```
Drug-Classifier-Model/
├── app.py                      # Flask Application & REST API
├── Drug_classifier.joblib      # Trained RandomForestRegressor model
├── model_creation.ipynb        # Jupyter Notebook for model training & evaluation
├── requirements.txt            # Python package dependencies
├── templates/
│   └── index.html              # HTML5 Web Application Interface
└── static/
    ├── css/
    │   └── style.css           # Glassmorphism CSS Design System
    └── js/
        └── main.js             # Asynchronous Client JS & Chart.js Logic
```

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/dhivyapraban/Drug-Classifier-Model.git
cd Drug-Classifier-Model
```

### 2. Set up a virtual environment (optional)

```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install requirements

```bash
pip install -r requirements.txt
```

### 4. Run the Flask Web Application

```bash
python app.py
```

Open your browser and navigate to `http://127.0.0.1:5000`.

---

## REST API Specification

### 1. Single Prediction Endpoint
`POST /api/predict`
- **Request Body (JSON)**:
  ```json
  {
    "MolLogP": 1.31,
    "MolWt": 180.16,
    "NumRotatableBonds": 3.0,
    "AromaticProportion": 0.67
  }
  ```
- **Response (JSON)**:
  ```json
  {
    "success": true,
    "inputs": { ... },
    "results": {
      "logS": -2.45,
      "solubility_class": "Moderately Soluble",
      "solubility_color": "amber",
      "concentration_g_per_l": 0.64,
      "molar_concentration": "3.55e-3",
      "lipinski": {
        "status": "Fully Compliant",
        "mw_pass": true,
        "logp_pass": true
      }
    }
  }
  ```

### 2. Presets Endpoint
`GET /api/presets`

### 3. Batch Predict Endpoint
`POST /api/batch-predict` (Accepts CSV file upload or JSON payload)

---

## License

This project is open-source under the [MIT License](LICENSE).