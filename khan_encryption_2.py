import random
import string
from hashlib import sha256
from decimal import Decimal, getcontext
from itertools import permutations

def generate_plaintext(length):
    return ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(length))

def encrypt(plaintext, prime, cyclic_sequence, start_position, superposition_sequence_length):
    char_to_movement, movement_to_char = generate_keys(prime, cyclic_sequence, start_position)
    superposition_sequence = generate_superposition_sequence(superposition_sequence_length)
    z_value = calculate_z_value(superposition_sequence)
    
    iv = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(8))
    salt = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(8))
    
    combined_text = iv + salt + plaintext
    ciphertext, z_layers = encrypt_message(combined_text, char_to_movement, z_value, superposition_sequence, salt, prime)
    return ciphertext, char_to_movement, movement_to_char, z_value, superposition_sequence, iv, salt, z_layers

def decrypt(ciphertext, char_to_movement, movement_to_char, z_value, superposition_sequence, iv, salt, z_layers, prime, start_position, cyclic_sequence):
    cyclic_sequence = cyclic_sequence[start_position:] + cyclic_sequence[:start_position]
    
    combined_text = decrypt_message(ciphertext, movement_to_char, z_value, superposition_sequence, z_layers, salt, prime)
    plaintext = combined_text[len(iv) + len(salt):]
    return plaintext

def brute_force_attack(ciphertext, possible_movements, movement_to_char):
    for perm in permutations(possible_movements, len(ciphertext)):
        plaintext = []
        try:
            for i, c in enumerate(ciphertext):
                if c == perm[i]:
                    plaintext.append(movement_to_char[perm[i]])
                else:
                    raise ValueError
            return ''.join(plaintext)
        except ValueError:
            continue
    return None

def known_plaintext_attack(plaintexts, prime, cyclic_sequence, start_position):
    results = []
    for pt in plaintexts:
        result = encrypt(pt, prime, cyclic_sequence, start_position)
        results.append(result)
    return results

def known_plaintext_attack_decrypt(ciphertexts, char_to_movement, movement_to_char, z_value, superposition_sequence, prime, iv, salt, z_layers, start_position, cyclic_sequence):
    results = []
    for ct in ciphertexts:
        result = decrypt(ct, char_to_movement, movement_to_char, z_value, superposition_sequence, iv, salt, z_layers, prime, start_position, cyclic_sequence)
        results.append(result)
    return results

def known_plaintext_attack_comparison(plaintexts, ciphertexts):
    results = []
    for i, pt in enumerate(plaintexts):
        result = pt == ciphertexts[i]
        results.append(result)
    return results

