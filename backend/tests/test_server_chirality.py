from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path to allow importing main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


def _post_chirality(smiles: str):
    return client.post('/chirality', json={'smiles': smiles})


def test_chirality_enantiomer_pair_has_opposite_rs_labels():
    # Lactic acid enantiomer pair
    response_a = _post_chirality('C[C@H](O)C(=O)O')
    response_b = _post_chirality('C[C@@H](O)C(=O)O')

    assert response_a.status_code == 200
    assert response_b.status_code == 200

    data_a = response_a.json()
    data_b = response_b.json()

    assert data_a['is_chiral'] is True
    assert data_b['is_chiral'] is True
    assert len(data_a['chiral_centers']) == 1
    assert len(data_b['chiral_centers']) == 1

    conf_a = data_a['chiral_centers'][0]['configuration']
    conf_b = data_b['chiral_centers'][0]['configuration']

    assert conf_a == 'S'
    assert conf_b == 'R'


def test_chirality_achiral_molecule_has_no_chiral_centers():
    # Isopropanol is achiral
    response = _post_chirality('CC(C)O')
    assert response.status_code == 200

    data = response.json()
    assert data['is_chiral'] is False
    assert data['chiral_centers'] == []
    assert data['chiral_atom_indices'] == []


def test_chirality_two_stereocenters_detected_and_assigned():
    # 3-chloro-2-butanol stereoisomer example
    response = _post_chirality('C[C@H](O)[C@@H](Cl)C')
    assert response.status_code == 200

    data = response.json()
    assert data['is_chiral'] is True
    assert len(data['chiral_centers']) == 2
    assert len(data['chiral_atom_indices']) == 2

    labels = {center['configuration'] for center in data['chiral_centers']}
    assert labels.issubset({'R', 'S'})
    assert 'Unassigned' not in labels


def test_chirality_empty_smiles_returns_400():
    response = _post_chirality('')
    assert response.status_code == 400


def test_chirality_invalid_smiles_payload_is_handled():
    # Non-empty but invalid SMILES should be handled by service response payload
    response = _post_chirality('not_a_smiles')
    assert response.status_code == 200

    data = response.json()
    assert data['is_chiral'] is False
    assert data['chiral_centers'] == []
    assert data['chiral_atom_indices'] == []
    assert data.get('error') == 'Invalid SMILES'
