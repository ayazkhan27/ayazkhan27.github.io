from flask import Flask, request, jsonify, render_template
import importlib.util
import sys
import logging
from decimal import Decimal, getcontext

# Import the khan_encryption_2.py module
module_name = "khan_encryption2"
file_path = "khan_encryption_2.py"
spec = importlib.util.spec_from_file_location(module_name, file_path)
ke = importlib.util.module_from_spec(spec)
sys.modules[module_name] = ke
spec.loader.exec_module(ke)

app = Flask(__name__)

# Setup logging
logging.basicConfig(level=logging.DEBUG)

def generate_cyclic_sequence(prime, length):
    getcontext().prec = length + 10
    decimal_expansion = str(Decimal(1) / Decimal(prime))[2:]
    return decimal_expansion[:length]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/encrypt', methods=['POST'])
def encrypt():
    app.logger.debug("Encrypt endpoint hit")
    try:
        data = request.json
        app.logger.debug(f"Received data: {data}")

        plaintext = data['plaintext']
        start_position = data['startPosition']
        superposition_sequence_length = data['superpositionLength']

        prime = 1051
        cyclic_sequence = generate_cyclic_sequence(prime, prime - 1)
        
        ciphertext, char_to_movement, movement_to_char, z_value, superposition_sequence, iv, salt, z_layers = ke.khan_encrypt(
            plaintext, prime, cyclic_sequence, start_position, superposition_sequence_length
        )
        
        response = {
            'ciphertext': ''.join(map(str, ciphertext)),
            'startPosition': start_position,
            'superpositionLength': superposition_sequence_length,
            'prime': prime,
            'cyclicSequence': cyclic_sequence
        }
        app.logger.debug(f"Response: {response}")

        return jsonify(response)
    except Exception as e:
        app.logger.error(f"Error during encryption: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
    app.run(debug=True)

