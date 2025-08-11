import pickle
import sqlite3

# SQL Injection Vulnerability
def get_user_details(user_id):
    conn = sqlite3.connect('example.db')
    cursor = conn.cursor()
    # Vulnerable to SQL Injection
    query = f"SELECT * FROM users WHERE user_id = {user_id}"
    cursor.execute(query)
    return cursor.fetchall()

# Insecure Deserialization Vulnerability
def load_session_data(session_cookie):
    # Insecure deserialization (user data is being deserialized directly from an untrusted source)
    session_data = pickle.loads(session_cookie)
    return session_data

# Example usage:
user_input = "1 OR 1=1"  # User input that could inject malicious SQL
print(get_user_details(user_input))  # SQL Injection

session_cookie = pickle.dumps({'user_id': 1, 'is_admin': True})
print(load_session_data(session_cookie))  # Insecure Deserialization
