from app.parsers.models.parsed_call import (
    ParsedCall
)


def extract_calls(node):

    calls = []

    stack = [node]

    while stack:

        current = stack.pop()

        if current.type == "call":

            func = (
                current.child_by_field_name(
                    "function"
                )
            )

            if func:

                calls.append(
                    ParsedCall(
                        name=func.text.decode()
                    )
                )

        stack.extend(
            current.children
        )

    return calls