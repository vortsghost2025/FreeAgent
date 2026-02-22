"""
test_phase_ix_narrative.py
Unit tests for Phase IX Dialogue Engine - aligned with actual module interfaces.
"""

import unittest
from dialogue_engine import (
    DialogueGenerator, CharacterDialogue, DialogueTree, DialogueNode,
    PersonalityArchetype, EmotionalTone, DialogueType, ConversationManager,
    RelationshipStatus
)


def make_character(char_id="char_001", name="Admiral Voss",
                   arch=PersonalityArchetype.THE_MENTOR):
    return CharacterDialogue(
        character_id=char_id,
        character_name=name,
        personality_archetype=arch
    )


class TestDialogueGenerator(unittest.TestCase):
    def setUp(self):
        self.generator = DialogueGenerator()
        self.char_a = make_character("a", "Alpha", PersonalityArchetype.THE_HERO)
        self.char_b = make_character("b", "Beta", PersonalityArchetype.THE_SHADOW)

    def test_personality_dialogue(self):
        result = self.generator.generate_personality_dialogue(
            self.char_a, "Stand firm, soldiers!"
        )
        self.assertIsInstance(result, str)
        self.assertTrue(len(result) > 0)

    def test_emotional_dialogue(self):
        result = self.generator.generate_emotional_dialogue(
            self.char_a, EmotionalTone.CONFIDENT, "We will prevail."
        )
        self.assertIsInstance(result, str)
        self.assertTrue(len(result) > 0)

    def test_contextual_dialogue(self):
        context = {"situation": "pre_battle", "morale": 80}
        result = self.generator.generate_contextual_dialogue(
            self.char_a, self.char_b, context
        )
        self.assertIsInstance(result, str)
        self.assertTrue(len(result) > 0)


class TestDialogueTree(unittest.TestCase):
    def setUp(self):
        self.tree = DialogueTree(
            tree_id="test_tree",
            title="Test Dialogue",
            root_node_id="node_1",
            participants=["Admiral", "Commander"]
        )

    def test_tree_creation(self):
        self.assertEqual(self.tree.tree_id, "test_tree")
        self.assertEqual(self.tree.title, "Test Dialogue")
        self.assertEqual(self.tree.root_node_id, "node_1")

    def test_add_node(self):
        node = DialogueNode(
            node_id="node_1",
            speaker="Admiral",
            dialogue_text="We must stand firm.",
            dialogue_type=DialogueType.STATEMENT,
            emotional_tone=EmotionalTone.CONFIDENT,
            personality=PersonalityArchetype.THE_MENTOR
        )
        self.tree.nodes["node_1"] = node
        self.assertIn("node_1", self.tree.nodes)
        self.assertEqual(self.tree.nodes["node_1"].speaker, "Admiral")


class TestCharacterDialogue(unittest.TestCase):
    def setUp(self):
        self.char = make_character()

    def test_character_creation(self):
        self.assertEqual(self.char.character_id, "char_001")
        self.assertEqual(self.char.character_name, "Admiral Voss")
        self.assertEqual(self.char.personality_archetype, PersonalityArchetype.THE_MENTOR)

    def test_character_has_trees(self):
        self.assertIsInstance(self.char.dialogue_templates, dict)

    def test_character_defaults(self):
        self.assertEqual(self.char.current_mood, EmotionalTone.NEUTRAL)
        self.assertIsInstance(self.char.relationships, dict)


class TestConversationManager(unittest.TestCase):
    def setUp(self):
        self.manager = ConversationManager(conversation_id="conv_001")

    def test_manager_creation(self):
        self.assertEqual(self.manager.conversation_id, "conv_001")

    def test_manager_has_participating_characters(self):
        self.assertIsInstance(self.manager.participating_characters, dict)

    def test_add_character(self):
        char = make_character("x", "Test Character")
        self.manager.add_character(char)
        self.assertIn("x", self.manager.participating_characters)


if __name__ == "__main__":
    unittest.main()
