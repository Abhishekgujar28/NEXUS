# Customer Churn Analysis

A reproducible machine-learning workflow for exploring customer churn and evaluating baseline classifiers with Python.

## What it does
- Validates a public telecom churn CSV and separates the target from predictors.
- Handles numeric missing values, encodes categorical features, and scales numeric features inside a train-only preprocessing pipeline.
- Uses a stratified holdout split and compares logistic regression with a random-forest classifier.
- Reports precision, recall, F1-score, ROC-AUC, and a confusion matrix.
- Documents the risks of class imbalance, leakage, and interpreting predictive association as causation.

## Dataset
Use a public Telco Customer Churn dataset whose CSV includes a `Churn` column and (optionally) `customerID` and `TotalCharges`. One accessible copy is [here](https://raw.githubusercontent.com/Giskard-AI/examples/main/datasets/WA_Fn-UseC_-Telco-Customer-Churn.csv). Save it as `data/telco_churn.csv`. The CSV is not stored in this repository. Follow the source dataset's license and terms.

## Run locally
```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python src/train.py --data data/telco_churn.csv
```

The script prints metrics for both models and saves `reports/confusion_matrix.png`. Metrics are dataset-dependent and should be recorded only after you run the script on the selected dataset.

## Interpretation checklist
1. Compare performance with a majority-class baseline.
2. Review precision and recall together; false negatives and false positives have different business costs.
3. Inspect feature definitions for potential target leakage.
4. Examine performance across meaningful customer segments when appropriate.
5. Do not treat feature importance or predictive association as causal evidence.
