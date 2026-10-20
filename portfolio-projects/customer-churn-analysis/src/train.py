"""Train transparent baseline models for a public telco churn dataset."""
from __future__ import annotations
import argparse
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, ConfusionMatrixDisplay, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default='data/telco_churn.csv')
    args = parser.parse_args()
    data_path = Path(args.data)
    if not data_path.exists():
        raise SystemExit(f'Dataset not found: {data_path}. See README for setup.')
    df = pd.read_csv(data_path)
    if 'Churn' not in df.columns:
        raise SystemExit("Expected a 'Churn' target column in the CSV.")
    df = df.copy().drop(columns=['customerID'], errors='ignore')
    y = df.pop('Churn').astype(str).str.strip().map({'Yes': 1, 'No': 0})
    valid = y.notna()
    X, y = df.loc[valid].copy(), y.loc[valid].astype(int)
    if 'TotalCharges' in X.columns:
        X['TotalCharges'] = pd.to_numeric(X['TotalCharges'], errors='coerce')
    numeric = X.select_dtypes(include=['number']).columns.tolist()
    categorical = [c for c in X.columns if c not in numeric]
    numeric_pipe = Pipeline([('imputer', SimpleImputer(strategy='median')), ('scale', StandardScaler())])
    categorical_pipe = Pipeline([('imputer', SimpleImputer(strategy='most_frequent')), ('onehot', OneHotEncoder(handle_unknown='ignore'))])
    prep = ColumnTransformer([('num', numeric_pipe, numeric), ('cat', categorical_pipe, categorical)])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    models = {
        'Logistic Regression': LogisticRegression(max_iter=2000, class_weight='balanced'),
        'Random Forest': RandomForestClassifier(n_estimators=300, random_state=42, class_weight='balanced', min_samples_leaf=3),
    }
    out = Path('reports'); out.mkdir(exist_ok=True)
    for name, estimator in models.items():
        model = Pipeline([('preprocess', prep), ('model', estimator)])
        model.fit(X_train, y_train)
        pred = model.predict(X_test)
        prob = model.predict_proba(X_test)[:, 1]
        print(f'\\n## {name}')
        print(classification_report(y_test, pred, target_names=['No churn', 'Churn'], zero_division=0))
        print(f'ROC-AUC: {roc_auc_score(y_test, prob):.4f}')
        if name == 'Logistic Regression':
            disp = ConfusionMatrixDisplay(confusion_matrix(y_test, pred), display_labels=['No churn', 'Churn'])
            disp.plot(cmap='Blues', values_format='d')
            plt.title('Customer Churn — Logistic Regression')
            plt.tight_layout(); plt.savefig(out / 'confusion_matrix.png', dpi=160); plt.close()
    print('\\nInterpret metrics in light of class imbalance and business costs; predictive associations are not causal explanations.')
if __name__ == '__main__':
    main()
