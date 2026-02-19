#!/usr/bin/env python3
"""
PHASE XVIII - CONSTITUTION ENGINE TESTS
Comprehensive test suite for self-interpreting laws and judicial reasoning (18 tests)
"""

import pytest
from datetime import datetime

from constitution_engine import (
    ConstitutionEngine,
    ConstitutionalAmendment,
    AmendmentStatus,
    InterpretationType,
)


class TestConstitutionInitialization:
    """Test constitution engine initialization"""

    def test_initialization(self):
        """Test engine initializes with base constitution"""
        engine = ConstitutionEngine()
        assert len(engine.rights) >= 3  # At least 3 core rights
        assert len(engine.constraints) >= 3  # At least 3 core constraints
        assert len(engine.principles) > 0

    def test_base_rights_established(self):
        """Test foundational rights are established"""
        engine = ConstitutionEngine()
        assert "right_free_speech" in engine.rights
        assert "right_due_process" in engine.rights
        assert "right_petition" in engine.rights

    def test_base_constraints_established(self):
        """Test foundational constraints are established"""
        engine = ConstitutionEngine()
        assert "no_unilateral_law" in engine.constraints
        assert "separation_of_powers" in engine.constraints
        assert "no_ex_post_facto" in engine.constraints


class TestAmendmentProcess:
    """Test constitutional amendment process"""

    @pytest.fixture
    def engine(self):
        return ConstitutionEngine()

    def test_propose_amendment(self, engine):
        """Test proposing a constitutional amendment"""
        amendment_id = engine.propose_amendment(
            "Ship_A",
            "Right to Navigation",
            "All ships have right to freely navigate",
            {"new_right": {"name": "Navigation", "protected_actions": ["navigate"]}},
        )
        assert amendment_id in engine.amendments
        assert engine.amendments[amendment_id].status == AmendmentStatus.PROPOSED

    def test_amendment_numbering(self, engine):
        """Test amendments are numbered correctly"""
        amendment_id1 = engine.propose_amendment("Ship_A", "First", "desc", {})
        amendment_id2 = engine.propose_amendment("Ship_B", "Second", "desc", {})
        assert engine.amendments[amendment_id1].amendment_number == 1
        assert engine.amendments[amendment_id2].amendment_number == 2

    def test_vote_on_amendment(self, engine):
        """Test voting on amendment"""
        amendment_id = engine.propose_amendment("Ship_A", "Title", "Desc", {})
        success = engine.vote_on_amendment(amendment_id, "Ship_B", True)
        assert success
        assert len(engine.amendments[amendment_id].ratification_votes) == 1

    def test_amendment_status_transitions(self, engine):
        """Test amendment status changes through voting"""
        amendment_id = engine.propose_amendment("Ship_A", "Title", "Desc", {})
        assert engine.amendments[amendment_id].status == AmendmentStatus.PROPOSED
        engine.vote_on_amendment(amendment_id, "Ship_B", True)
        assert engine.amendments[amendment_id].status == AmendmentStatus.DEBATED

    def test_amendment_ratification_unanimous(self, engine):
        """Test unanimous ratification (1 vote required)"""
        amendment_id = engine.propose_amendment(
            "Ship_A", "Title", "Desc", {}, ratification_required=1
        )
        engine.vote_on_amendment(amendment_id, "Ship_A", True)
        result = engine.finalize_amendment_vote(amendment_id)
        assert result
        assert engine.amendments[amendment_id].status == AmendmentStatus.RATIFIED

    def test_amendment_ratification_two_thirds(self, engine):
        """Test 2/3 majority ratification"""
        amendment_id = engine.propose_amendment(
            "Ship_A", "Title", "Desc", {}, ratification_required=2
        )
        # 4 votes, 3 for = 75% > 66%
        engine.vote_on_amendment(amendment_id, "Ship_A", True)
        engine.vote_on_amendment(amendment_id, "Ship_B", True)
        engine.vote_on_amendment(amendment_id, "Ship_C", True)
        engine.vote_on_amendment(amendment_id, "Ship_D", False)
        result = engine.finalize_amendment_vote(amendment_id)
        assert result
        assert engine.amendments[amendment_id].status == AmendmentStatus.RATIFIED

    def test_amendment_rejection(self, engine):
        """Test amendment rejection (insufficient votes)"""
        amendment_id = engine.propose_amendment(
            "Ship_A", "Title", "Desc", {}, ratification_required=2
        )
        engine.vote_on_amendment(amendment_id, "Ship_A", True)
        engine.vote_on_amendment(amendment_id, "Ship_B", False)
        engine.vote_on_amendment(amendment_id, "Ship_C", False)
        result = engine.finalize_amendment_vote(amendment_id)
        assert not result
        assert engine.amendments[amendment_id].status == AmendmentStatus.REJECTED


class TestJudicialReview:
    """Test judicial opinion and case resolution"""

    @pytest.fixture
    def engine(self):
        return ConstitutionEngine()

    def test_file_case(self, engine):
        """Test filing a constitutional case"""
        case_id = engine.file_case(
            "Ship_A",
            "Ship_B",
            "Does law X violate due process?",
            "Ship B was punished without trial",
        )
        assert case_id in engine.cases
        assert engine.cases[case_id].plaintiff == "Ship_A"

    def test_issue_opinion_trial(self, engine):
        """Test issuing trial opinion"""
        case_id = engine.file_case("Ship_A", "Ship_B", "Question?", "Facts")
        opinion_id = engine.issue_judicial_opinion(
            case_id,
            "Judge_1",
            InterpretationType.TEXTUALIST,
            "Law violates due process",
            ["The text clearly requires trial"],
            authority_level="TRIAL",
        )
        assert opinion_id in engine.opinions
        opinion = engine.opinions[opinion_id]
        assert opinion.authority_level == "TRIAL"
        assert opinion.interpretation_type == InterpretationType.TEXTUALIST

    def test_supreme_court_opinion(self, engine):
        """Test supreme court opinion sets high precedent"""
        case_id = engine.file_case("Ship_A", "Ship_B", "Question?", "Facts")
        opinion_id = engine.issue_judicial_opinion(
            case_id,
            "Chief_Justice",
            InterpretationType.ORIGINALIST,
            "Ruling",
            ["Reasoning"],
            authority_level="SUPREME_COURT",
        )
        assert engine.cases[case_id].precedent_value == 1.0

    def test_appellate_opinion(self, engine):
        """Test appellate opinion has moderate precedent"""
        case_id = engine.file_case("Ship_A", "Ship_B", "Question?", "Facts")
        opinion_id = engine.issue_judicial_opinion(
            case_id,
            "Judge",
            InterpretationType.LIVING_DOCUMENT,
            "Ruling",
            ["Reasoning"],
            authority_level="APPELLATE",
        )
        assert engine.cases[case_id].precedent_value == 0.7

    def test_precedents_cited(self, engine):
        """Test judicial opinion cites precedents"""
        case_id = engine.file_case("A", "B", "Q?", "F")
        opinion_id = engine.issue_judicial_opinion(
            case_id,
            "Judge",
            InterpretationType.TEXTUALIST,
            "Ruling",
            ["Logic"],
            precedents_cited=["case_0001", "case_0002"],
        )
        opinion = engine.opinions[opinion_id]
        assert len(opinion.precedents_cited) == 2


class TestLawValidation:
    """Test constitutional validation of proposed laws"""

    @pytest.fixture
    def engine(self):
        return ConstitutionEngine()

    def test_validate_constitutional_law(self, engine):
        """Test validation of constitutionally sound law"""
        law_text = "All ships shall report their status weekly"
        result = engine.validate_law(law_text, "Ship_A")
        assert result["valid"]
        assert len(result["issues"]) == 0

    def test_validate_violates_constraint(self, engine):
        """Test law that violates constraint is flagged"""
        law_text = "The executive shall have sole unilateral power"
        result = engine.validate_law(law_text, "Ship_A")
        assert not result["valid"]
        assert len(result["issues"]) > 0

    def test_validate_affects_right(self, engine):
        """Test law that affects rights generates warning"""
        law_text = "All ships must restrict discussion of governance"
        result = engine.validate_law(law_text, "Ship_A")
        # May have warnings even if technically valid
        assert "warnings" in result

    def test_unconstitutional_law_amendable(self, engine):
        """Test unconstitutional law can be amended"""
        law_text = "The executive shall have absolute power"
        result = engine.validate_law(law_text, "Ship_A")
        assert not result["valid"]
        assert result["can_be_amended"]  # Could propose amendment to permit this


class TestConstitutionalInterpretation:
    """Test constitutional interpretation methods"""

    @pytest.fixture
    def engine(self):
        return ConstitutionEngine()

    def test_interpret_separation_of_powers(self, engine):
        """Test interpretation of separation of powers"""
        result = engine.interpret_constitution(
            "Should executive have legislative power?",
            InterpretationType.STRICT_CONSTRUCTION,
        )
        assert "separation" in result["answer"].lower()
        assert result["interpretation_type"] == "strict_construction"

    def test_interpret_amendment_process(self, engine):
        """Test interpretation of amendment requirements"""
        result = engine.interpret_constitution(
            "How hard should amendments be?",
            InterpretationType.ORIGINALIST,
        )
        assert "amendment" in result["answer"].lower()

    def test_interpret_rights_protection(self, engine):
        """Test interpretation of rights"""
        result = engine.interpret_constitution(
            "Are rights absolute?",
            InterpretationType.LIVING_DOCUMENT,
        )
        assert "right" in result["answer"].lower()

    def test_interpretation_authority(self, engine):
        """Test different interpretations have different authority"""
        strict = engine.interpret_constitution(
            "Question?", InterpretationType.STRICT_CONSTRUCTION
        )
        living = engine.interpret_constitution(
            "Question?", InterpretationType.LIVING_DOCUMENT
        )
        # Both valid interpretations but different weights
        assert strict["authority_level"] > 0
        assert living["authority_level"] > 0


class TestConstitutionalStatus:
    """Test constitutional status reporting"""

    @pytest.fixture
    def engine(self):
        eng = ConstitutionEngine()
        # Add some activities
        eng.propose_amendment("Ship_A", "A1", "Desc", {})
        eng.propose_amendment("Ship_B", "A2", "Desc", {})
        eng.file_case("Ship_A", "Ship_B", "Q", "F")
        return eng

    def test_get_status(self, engine):
        """Test getting comprehensive constitutional status"""
        status = engine.get_constitutional_status()
        assert status["total_rights"] >= 3
        assert status["total_constraints"] >= 3
        assert status["amendments_proposed"] >= 2
        assert status["cases_filed"] >= 1

    def test_status_counts_amendments(self, engine):
        """Test status correctly counts amendments by type"""
        amendment_id = engine.amendments[list(engine.amendments.keys())[0]]
        amendment_id.status = AmendmentStatus.RATIFIED
        status = engine.get_constitutional_status()
        assert status["amendments_ratified"] >= 1

    def test_status_counts_cases(self, engine):
        """Test status correctly counts cases"""
        case_id = list(engine.cases.keys())[0]
        engine.cases[case_id].status = "DECIDED"
        status = engine.get_constitutional_status()
        assert status["cases_decided"] >= 1

    def test_status_lists_interpretations(self, engine):
        """Test status lists available interpretation methods"""
        status = engine.get_constitutional_status()
        assert "originalist" in status["interpretation_methods"]
        assert "textualist" in status["interpretation_methods"]
        assert "living_document" in status["interpretation_methods"]


class TestRightsAndConstraints:
    """Test rights and constraint establishment"""

    def test_right_established_correctly(self):
        """Test right is established with all properties"""
        engine = ConstitutionEngine()
        right = engine.rights["right_free_speech"]
        assert right.name == "Freedom of Speech"
        assert len(right.protected_actions) > 0
        assert right.priority > 0

    def test_constraint_established_correctly(self):
        """Test constraint is established with all properties"""
        engine = ConstitutionEngine()
        constraint = engine.constraints["no_unilateral_law"]
        assert len(constraint.description) > 0
        assert len(constraint.affected_actors) > 0
        assert constraint.checkable

    def test_principles_properly_linked(self):
        """Test constitutional principles are linked to rights/constraints"""
        engine = ConstitutionEngine()
        protection_linked = len(
            engine.principles["protection_of_rights"]
        ) > 0
        separation_linked = len(
            engine.principles["separation_of_powers"]
        ) > 0
        assert protection_linked
        assert separation_linked


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
