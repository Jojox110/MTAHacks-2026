import outlines
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from pydantic import BaseModel, Field
from typing import List, Dict

# ==========================================
# 1. Define the Pydantic Schema
# ==========================================
class ClassRecommendation(BaseModel):
    recommended_classes: List[str] = Field(
        ..., 
        description="A list of the exact class codes selected from the available classes."
    )
    reasoning: str = Field(
        ..., 
        description="A brief, 2-sentence explanation of why this specific combination is optimal for the user's career goals."
    )

# ==========================================
# 2. Define the Recommender Class
# ==========================================
class CourseRecommender:
    def __init__(self, model_name: str = "Qwen/Qwen2.5-7B-Instruct"):
        """
        Initializes the model, tokenizer, and Outlines generator.
        This should be called ONLY ONCE when your backend server starts up.
        """
        print(f"Loading {model_name} into VRAM...")
        self.hf_tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.hf_model = AutoModelForCausalLM.from_pretrained(
            model_name, 
            torch_dtype="auto", 
            device_map="auto"
        )
        
        print("Compiling Outlines FSM (Finite State Machine)...")
        # Connect Outlines to the underlying Hugging Face model
        self.model = outlines.models.transformers(self.hf_model, self.hf_tokenizer)
        
        # Build the JSON generator tied to the Pydantic schema
        self.generator = outlines.generate.json(self.model, ClassRecommendation)
        print("System ready.")

    def get_recommendations(self, available_classes: List[str], user_interests: str, max_classes: int = 4) -> Dict:
        """
        The fully callable function. Pass in the lists and strings, get a dictionary back.
        """
        formatted_classes = "\n".join([f"- {c}" for c in available_classes])
        
        system_prompt = (
            "You are an expert academic advisor AI. "
            f"Select up to {max_classes} classes from the available list that best align "
            "with the user's career interests."
        )
        user_prompt = f"User Career Interests:\n{user_interests}\n\nAvailable Classes:\n{formatted_classes}"

        # Standard ChatML formatting
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        prompt = self.hf_tokenizer.apply_chat_template(
            messages, 
            tokenize=False, 
            add_generation_prompt=True
        )

        # Generate the structured output
        recommendation: ClassRecommendation = self.generator(prompt)
        
        # Return as a standard Python dictionary for easy backend routing (e.g., via FastAPI)
        return recommendation.model_dump()


# ==========================================
# Example Backend Integration
# ==========================================
if __name__ == "__main__":
    # 1. Initialize this ONCE at server startup
    recommender = CourseRecommender()
    
    # 2. Use it as many times as you want via your API endpoints
    classes_db = [
        "INFO2001 intro architecture ordinateur",
        "COMP3401 Machine Learning Fundamentals",
        "ART1011 Introduction to Modern Art",
        "BUSI2022 Principles of Tech Entrepreneurship",
        "MATH1050 Linear Algebra",
        "LIT3001 Sci-Fi Literature"
    ]
    student_interests = "I want to become an AI engineer and eventually start my own tech startup."
    
    # Call the function!
    output_dict = recommender.get_recommendations(classes_db, student_interests)
    
    print("\n--- Final Output ---")
    print(output_dict) 
    # Example output: {'recommended_classes': ['COMP3401', 'BUSI2022', ...], 'reasoning': '...'}