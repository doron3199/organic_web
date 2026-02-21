import logging

# Enable DEBUG-level logging for all engine modules during tests
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logging.getLogger("engine").setLevel(logging.DEBUG)
