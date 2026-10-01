"""Veritabanından gelen tiplerin JSON'a dönüştürülmesi."""
from datetime import date, datetime
from decimal import Decimal

import numpy as np
from flask.json.provider import DefaultJSONProvider


def json_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return str(obj)


class AppJSONProvider(DefaultJSONProvider):
    ensure_ascii = False

    @staticmethod
    def default(obj):
        return json_default(obj)
