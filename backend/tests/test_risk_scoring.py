import pytest

from services import risk_scoring as rs


@pytest.mark.parametrize(
    ("price", "avg", "expected"),
    [
        (1600, 1000, 8.0),
        (1300, 1000, 6.0),
        (1000, 1000, 3.0),
        (700, 1000, 4.0),
        (0, 1000, rs.NEUTRAL_RISK),
        (1000, None, rs.NEUTRAL_RISK),
    ],
)
def test_price_risk(price, avg, expected):
    assert rs.price_risk(price, avg) == expected


@pytest.mark.parametrize(
    ("rating", "expected"),
    [(4.8, 2.0), (4.2, 3.0), (3.7, 5.0), (3.1, 7.0), (2.0, 9.0), (0, rs.NEUTRAL_RISK)],
)
def test_rating_risk(rating, expected):
    assert rs.rating_risk(rating) == expected


@pytest.mark.parametrize(
    ("count", "expected"),
    [(80, 8.0), (30, 6.0), (15, 4.0), (3, 2.0), (None, rs.NEUTRAL_RISK)],
)
def test_competition_risk(count, expected):
    assert rs.competition_risk(count) == expected


def test_build_risk_analysis_combines_scores():
    analysis = rs.build_risk_analysis(price=1600, rating=4.8, category_avg_price=1000, same_brand_count=3)

    assert analysis["price_risk"] == 8.0
    assert analysis["rating_risk"] == 2.0
    assert analysis["competition_risk"] == 2.0
    assert analysis["overall_risk"] == 4.0
    assert analysis["risk_level"] == "DÜŞÜK RİSK"
    assert analysis["seller_recommendation"].startswith("SATIŞ YAPILABİLİR")


@pytest.mark.parametrize(
    ("score", "level"),
    [(8, "YÜKSEK RİSK"), (5.5, "ORTA RİSK"), (3.2, "DÜŞÜK RİSK"), (1, "ÇOK DÜŞÜK RİSK")],
)
def test_risk_level(score, level):
    assert rs.risk_level(score) == level


def test_to_float_handles_invalid_values():
    assert rs.to_float("12.5") == 12.5
    assert rs.to_float(None) == 0.0
    assert rs.to_float("abc", None) is None


def test_quick_risk_score():
    assert rs.quick_risk_score(price=5000, rating=4.0) == 3.5
    assert rs.quick_risk_score(price=0, rating=0) == 7.5
