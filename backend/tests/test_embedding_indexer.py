from services.embedding_indexer import build_document


def test_build_document_combines_text_columns():
    row = {"id": 1, "name": "Telefon X", "brand": "Marka", "description": None, "seller_summary": "Özet"}
    name, text = build_document(row, ["name", "brand", "description", "seller_summary"])

    assert name == "Telefon X"
    assert text == "name: Telefon X | brand: Marka | seller_summary: Özet"


def test_build_document_skips_empty_and_null_values():
    row = {"name": "  ", "title": "null", "description": "Açıklama"}
    name, text = build_document(row, ["name", "title", "description"])

    assert name == ""
    assert text == "description: Açıklama"


def test_build_document_truncates_long_fields():
    row = {"description": "a" * 2000}
    _, text = build_document(row, ["description"])
    assert len(text) == len("description: ") + 500
