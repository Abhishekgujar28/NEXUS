"""Compare seasonal-naive and random-forest forecasts on retail sales."""
from __future__ import annotations
import argparse
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default='data/train.csv')
    parser.add_argument('--store', type=int, default=1)
    parser.add_argument('--family', default='GROCERY I')
    parser.add_argument('--test-days', type=int, default=30)
    args = parser.parse_args()
    path = Path(args.data)
    if not path.exists():
        raise SystemExit(f'Dataset not found: {path}. See README for setup.')
    df = pd.read_csv(path, parse_dates=['date'])
    required = {'date', 'store_nbr', 'family', 'sales'}
    if not required.issubset(df.columns):
        raise SystemExit(f'Expected columns: {sorted(required)}')
    s = df[(df.store_nbr == args.store) & (df.family == args.family)].copy()
    if s.empty:
        raise SystemExit('No rows for that store/family combination.')
    s = s.groupby('date', as_index=False)['sales'].sum().sort_values('date')
    full_idx = pd.date_range(s.date.min(), s.date.max(), freq='D')
    s = s.set_index('date').reindex(full_idx).rename_axis('date').reset_index()
    s['sales'] = s['sales'].astype(float)
    s['dow'] = s.date.dt.dayofweek
    s['month'] = s.date.dt.month
    s['dayofyear'] = s.date.dt.dayofyear
    s['lag_7'] = s.sales.shift(7)
    s = s.dropna(subset=['sales', 'lag_7']).reset_index(drop=True)
    if len(s) <= args.test_days + 14:
        raise SystemExit('Not enough observations for requested holdout and lag features.')
    cutoff = s.date.max() - pd.Timedelta(days=args.test_days - 1)
    train, test = s[s.date < cutoff].copy(), s[s.date >= cutoff].copy()
    features = ['dow', 'month', 'dayofyear', 'lag_7']
    baseline_pred = test['lag_7'].to_numpy()
    model = RandomForestRegressor(n_estimators=300, min_samples_leaf=3, random_state=42, n_jobs=-1)
    model.fit(train[features], train['sales'])
    model_pred = model.predict(test[features])
    for name, pred in [('Seasonal naive (7-day lag)', baseline_pred), ('Random forest + calendar/lag features', model_pred)]:
        print(f'\n{name}')
        print(f'MAE:  {mean_absolute_error(test.sales, pred):.3f}')
        print(f'RMSE: {np.sqrt(mean_squared_error(test.sales, pred)):.3f}')
    print(f'\nHoldout dates: {test.date.min().date()} to {test.date.max().date()}')
    print('Interpret as a rolling one-step-ahead benchmark; account for missing dates, promotions, holidays, and changing store conditions.')
if __name__ == '__main__':
    main()
