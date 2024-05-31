from flask import Flask, render_template, request, jsonify
import random
import string
from hashlib import sha256
from decimal import Decimal, getcontext
from khan_encryption_2 import khan_encrypt, khan_decrypt, generate_plaintext, initialize_dictionaries

app = Flask(__name__)

def generate_cyclic_sequence(prime, length):
    getcontext().prec = length + 10  # Set precision to required length + buffer
    decimal_expansion = str(Decimal(1) / Decimal(prime))[2:]  # Get decimal expansion as string, skipping '0.'
    return decimal_expansion[:length]

def calculate_z_value(superposition_sequence_length):
    return superposition_sequence_length - 1

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/encrypt', methods=['POST'])
def encrypt():
    data = request.json
    plaintext = data['plaintext']
    start_position = int(data['start_position'])
    superposition_sequence_length = int(data['superposition_sequence_length'])

    cyclic_prime = 1051
    cyclic_sequence = generate_cyclic_sequence(cyclic_prime, cyclic_prime - 1)

    # Generate superposition sequence
    superposition_sequence = [random.choice([-1, 1]) for _ in range(superposition_sequence_length)]
    while sum(superposition_sequence) != 0:
        superposition_sequence = [random.choice([-1, 1]) for _ in range(superposition_sequence_length)]

    # Calculate z_value
    z_value = calculate_z_value(superposition_sequence_length)

    # Encrypt the plaintext
    ciphertext, char_to_movement, movement_to_char, z_value, superposition_sequence, iv, salt, z_layers = khan_encrypt(
        plaintext, cyclic_prime, cyclic_sequence, start_position, superposition_sequence_length
    )

    # Decrypt the ciphertext to verify
    decrypted_text = khan_decrypt(
        ciphertext, char_to_movement, movement_to_char, z_value, superposition_sequence, iv, salt, z_layers, cyclic_prime, start_position, cyclic_sequence
    )

    return jsonify({
        'ciphertext': ciphertext,
        'decryptedMessage': decrypted_text
    })

if __name__ == '__main__':
    app.run(debug=True)
