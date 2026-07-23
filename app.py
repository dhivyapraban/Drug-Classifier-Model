from flask import Flask, request, render_template
import joblib
import numpy as np

app = Flask(__name__)

# Load your joblib model
model = joblib.load("Drug_classifier.joblib")

@app.route("/", methods=["GET", "POST"])
def home():
    prediction = None
    if request.method == "POST":
        try:
            # Get user input from form and convert to float
            MolLogP = float(request.form["MolLogP"])
            MolWt = float(request.form["MolWt"])
            NumRotatableBonds = float(request.form["NumRotatableBonds"])
            AromaticProportion = float(request.form["AromaticProportion"])

            # Convert to 2D array for model
            features = np.array([[MolLogP, MolWt, NumRotatableBonds, AromaticProportion]])

            # Predict
            prediction = model.predict(features)[0]
        except Exception as e:
            prediction = f"Error: {e}"

    return render_template("index.html", prediction=prediction)

if __name__ == "__main__":
    app.run(debug=True)
