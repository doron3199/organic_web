from typing import Dict, List, Optional
from .models import ReactionRule


class ReactionRegistry:
    _instance = None

    def __init__(self):
        self._rules: Dict[str, ReactionRule] = {}

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ReactionRegistry()
        return cls._instance

    def register(self, rule: ReactionRule):
        self._rules[rule.id] = rule

    def get(self, rule_id: str) -> Optional[ReactionRule]:
        return self._rules.get(rule_id)

    def get_all(self) -> List[ReactionRule]:
        return list(self._rules.values())

    def clear(self):
        self._rules = {}
