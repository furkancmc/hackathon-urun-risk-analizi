"""Flask uygulamasının giriş noktası.

Geliştirme:   python app.py
Production:   gunicorn "app:create_app()"
"""
import logging

from flask import Flask
from flask_cors import CORS

from config import load_settings
from routes import api
from serialization import AppJSONProvider
from services import Services, build_services


def create_app(services: Services | None = None) -> Flask:
    settings = load_settings()
    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

    app = Flask(__name__)
    app.json = AppJSONProvider(app)
    CORS(app, resources={r"/api/*": {"origins": settings.cors_origins}})

    app.extensions["services"] = services if services is not None else build_services(settings)
    app.register_blueprint(api)
    return app


if __name__ == "__main__":
    settings = load_settings()
    create_app().run(host=settings.api_host, port=settings.api_port, debug=settings.debug)
