# Drug-Classifier-Model

This project uses **linear regression** to classify drugs. The metrics used in the model are:

- MolLogP
- MolWt
- NumRotatableBonds
- AromaticProportion
- logS

---

## Project Structure

- `app.py` : Flask application that routes the model for predictions.
- `templates/` : Contains `index.html` for the web interface.
- `model.joblib` : Trained model used by the Flask app.
- `model_creation.ipynb` : Notebook showing how the model was created and visualized.

---

## How to Run the Project

Follow these steps after cloning the repository:

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/Drug-Classifier-Model.git
cd Drug-Classifier-Model
```
### 2. Set up a virtual environment (optional but recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 3. Install required dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Flask app

```bash
python app.py
```
### 5. Use the App

- Input the drug metrics in the web form.
- The app will predict/classify the drug using the trained model (model.joblib).

### Reference

- For how the model was created and visualized, see model_creation.ipynb.
- The Flask interface uses templates/index.html.

### Notes

- Make sure model.joblib is in the same folder as app.py.
- This project currently works with Python 3.x.