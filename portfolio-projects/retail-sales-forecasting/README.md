# Retail Sales Forecasting

A time-series regression experiment comparing a seven-day seasonal-naive baseline with a random-forest model that uses calendar and lag features.

## What it does
- Filters a retail sales dataset by store and product family.
- Aggregates sales to a daily series and constructs weekday, month, day-of-year, and seven-day lag features.
- Uses a chronological holdout rather than randomly shuffling time-series rows.
- Compares MAE and RMSE for a seasonal-naive baseline and a random-forest regressor.
- Calls out limitations involving missing dates, promotions, holidays, and changing store conditions.

## Dataset
Use the public Kaggle [Store Sales - Time Series Forecasting](https://www.kaggle.com/competitions/store-sales-time-series-forecasting/data) dataset. Download `train.csv` and save it as `data/train.csv`. A Kaggle account and competition-rule acceptance may be required. The dataset is not included here; review the dataset's license/terms before use.

## Run locally
```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python src/forecast.py --data data/train.csv --store 1 --family 'GROCERY I'
```

Optional arguments: `--test-days 30` changes the size of the recent holdout period. The script reports metrics for the chosen series; quality depends on the series and split.

## Methodology notes
- Hold out the most recent dates and do not shuffle time series.
- The seasonal-naive prediction uses observed sales from seven days earlier, which represents a rolling one-step-ahead setting.
- Missing dates are reindexed and excluded from target evaluation rather than silently assumed to be zero sales.
- Extend the model with promotion and holiday signals only after validating data availability and forecast-time assumptions.
