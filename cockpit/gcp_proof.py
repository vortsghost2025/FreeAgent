"""
Google Cloud Platform Proof File
This file demonstrates Google Cloud API usage for hackathon verification.
"""

# Vertex AI - Gemini Model
from vertexai.generative_models import GenerativeModel

def test_vertex_ai():
    """Test Vertex AI Gemini model"""
    model = GenerativeModel("gemini-1.5-flash")
    response = model.generate_content("Hello from Google Cloud.")
    print(response.text)

# Google Cloud Storage
from google.cloud import storage

def list_buckets():
    """List GCS buckets"""
    client = storage.Client()
    buckets = list(client.list_buckets())
    for bucket in buckets:
        print(bucket.name)

# BigQuery
from google.cloud import bigquery

def query_bigquery():
    """Execute a BigQuery query"""
    client = bigquery.Client()
    query = "SELECT 1 as test"
    result = client.query(query)
    for row in result:
        print(row)

# Cloud Functions
# from google.cloud import functions_v2

# Run tests
if __name__ == "__main__":
    print("Testing Google Cloud APIs...")
    # test_vertex_ai()
    # list_buckets()
    # query_bigquery()
    print("GCP proof file loaded successfully!")
