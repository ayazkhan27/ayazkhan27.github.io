from flask import Flask, request, jsonify, render_template
import importlib.util
import sys
from decimal import Decimal, getcontext

# Import the khan_encryption_2.py module
module_name = "khan_encryption2"
file_path = "khan_encryption_2.py"
spec = importlib.util.spec_from_file_location(module_name, file_path)
ke = importlib.util.module_from_spec(spec)
sys.modules[module_name] = ke
spec.loader.exec_module(ke)

app = Flask(__name__)

def generate_cyclic_sequence(prime, length):
    getcontext().prec = length + 10
    decimal_expansion = str(Decimal(1) / Decimal(prime))[2:]
    return decimal_expansion[:length]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/encrypt', methods=['POST'])
def encrypt():
    data = request.json
    plaintext = data['plaintext']
    start_position = data['startPosition']
    superposition_sequence_length = data['superpositionLength']

    prime = 1051
    cyclic_sequence = generate_cyclic_sequence(prime, prime - 1)
    
    ciphertext, char_to_movement, movement_to_char, z_value, superposition_sequence, iv, salt, z_layers = ke.khan_encrypt(
        plaintext, prime, cyclic_sequence, start_position, superposition_sequence_length
    )
    decrypted_text = ke.khan_decrypt(
        ciphertext, char_to_movement, movement_to_char, z_value, superposition_sequence, iv, salt, z_layers, prime, start_position, cyclic_sequence
    )

    return jsonify({
        'ciphertext': ''.join(map(str, ciphertext)),
        'decryptedMessage': decrypted_text
    })

if __name__ == '__main__':
    app.run(debug=True)
