
def vulnerable_function(user_input):
    query = f"SELECT * FROM users WHERE id = {user_input}"
    return execute_query(query)

password = "secret123"
api_key = "sk-1234567890abcdef"

