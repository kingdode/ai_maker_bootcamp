#!/usr/bin/env python
import sys
import warnings

from datetime import datetime

from newsletter_crew.crew import NewsletterCrew

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

# This main file is intended to be a way for you to run your
# crew locally, so refrain from adding unnecessary logic into this file.
# Replace with inputs you want to test with, it will automatically
# interpolate any tasks and agents information

def run():
    """
    Run the crew.
    """
    inputs = {
        'topic': 'MCP (Model Context Protocol 2025)',
        'current_year': str(datetime.now().year)
    }

    try:
        result = NewsletterCrew().crew().kickoff(inputs=inputs)
        # Extract HTML from the result if it's in the output
        if result and hasattr(result, 'tasks_output'):
            # Try to get the HTML from the last task (reporting_task)
            for task_output in result.tasks_output:
                if 'reporting' in str(task_output).lower() or 'html' in str(task_output).lower():
                    output_str = str(task_output)
                    # Try to extract HTML if it exists in the output
                    if '<!DOCTYPE' in output_str or '<html' in output_str:
                        import re
                        html_match = re.search(r'(<!DOCTYPE.*?</html>)', output_str, re.DOTALL)
                        if html_match:
                            with open('report.html', 'w', encoding='utf-8') as f:
                                f.write(html_match.group(1))
        return result
    except Exception as e:
        raise Exception(f"An error occurred while running the crew: {e}")


def train():
    """
    Train the crew for a given number of iterations.
    """
    inputs = {
        "topic": "MCP (Model Context Protocol 2025)",
        'current_year': str(datetime.now().year)
    }
    try:
        NewsletterCrew().crew().train(n_iterations=int(sys.argv[1]), filename=sys.argv[2], inputs=inputs)

    except Exception as e:
        raise Exception(f"An error occurred while training the crew: {e}")

def replay():
    """
    Replay the crew execution from a specific task.
    """
    try:
        NewsletterCrew().crew().replay(task_id=sys.argv[1])

    except Exception as e:
        raise Exception(f"An error occurred while replaying the crew: {e}")

def test():
    """
    Test the crew execution and returns the results.
    """
    inputs = {
        "topic": "the last 20 years of baseball statistics",
        "current_year": str(datetime.now().year)
    }

    try:
        NewsletterCrew().crew().test(n_iterations=int(sys.argv[1]), eval_llm=sys.argv[2], inputs=inputs)

    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}")

def run_with_trigger():
    """
    Run the crew with trigger payload.
    """
    import json

    if len(sys.argv) < 2:
        raise Exception("No trigger payload provided. Please provide JSON payload as argument.")

    try:
        trigger_payload = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        raise Exception("Invalid JSON payload provided as argument")

    inputs = {
        "crewai_trigger_payload": trigger_payload,
        "topic": "MCP (Model Context Protocol 2025)",
        "current_year": str(datetime.now().year)
    }

    try:
        result = NewsletterCrew().crew().kickoff(inputs=inputs)
        return result
    except Exception as e:
        raise Exception(f"An error occurred while running the crew with trigger: {e}")
