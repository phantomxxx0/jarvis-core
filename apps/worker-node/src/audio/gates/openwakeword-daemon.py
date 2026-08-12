#!/usr/bin/env python3
import sys
import argparse
import json
import logging
import numpy as np
import openwakeword
from openwakeword.model import Model

# Configure logging to go exclusively to stderr
logging.basicConfig(level=logging.INFO, stream=sys.stderr, format='%(asctime)s - %(levelname)s - %(message)s')
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, required=True, help="Wake word model path or name")
    args = parser.parse_args()

    logging.info(f"Initializing openWakeWord daemon with model: {args.model}")
    
    try:
        model_name = args.model
        # Resolve to absolute path if it's a pretrained model name
        model_path = model_name
        for p in openwakeword.get_pretrained_model_paths():
            if model_name in p:
                model_path = p
                break
                
        # Load the specific configured model
        oww_model = Model(wakeword_model_paths=[model_path])
    except Exception as e:
        logging.error(f"Failed to load openWakeWord model: {e}")
        sys.exit(1)

    logging.info("Model loaded successfully. Listening on stdin...")

    CHUNK_SAMPLES = 1280
    BYTES_PER_SAMPLE = 2 # 16-bit PCM
    CHUNK_BYTES = CHUNK_SAMPLES * BYTES_PER_SAMPLE

    buffer = bytearray()
    
    cooldown_chunks = 0
    COOLDOWN_THRESHOLD = 20 # 20 chunks * 80ms = 1.6 seconds of cooldown

    while True:
        try:
            # Read a small amount of data
            # We use read1 or read if not buffered, but sys.stdin.buffer.read is fine
            chunk = sys.stdin.buffer.read(4096)
            if not chunk:
                logging.info("EOF received on stdin. Exiting.")
                break
                
            buffer.extend(chunk)

            # Process all complete chunks in the buffer
            while len(buffer) >= CHUNK_BYTES:
                frame_bytes = buffer[:CHUNK_BYTES]
                del buffer[:CHUNK_BYTES]

                if cooldown_chunks > 0:
                    cooldown_chunks -= 1

                # Convert to numpy array
                np_frame = np.frombuffer(frame_bytes, dtype=np.int16)
                
                # Predict
                prediction = oww_model.predict(np_frame)
                
                # Check scores
                for model_name, score in prediction.items():
                    if score > 0.5 and cooldown_chunks == 0:
                        # We have a trigger
                        event = {
                            "event": "wake_word",
                            "model": model_name,
                            "score": float(score)
                        }
                        # Print JSON to stdout
                        print(json.dumps(event), flush=True)
                        logging.info(f"Wake word detected! Model: {model_name}, Score: {score}")
                        
                        # Set cooldown
                        cooldown_chunks = COOLDOWN_THRESHOLD

        except KeyboardInterrupt:
            logging.info("Interrupted by user. Exiting.")
            break
        except Exception as e:
            logging.error(f"Error processing audio: {e}")
            break

if __name__ == '__main__':
    main()
