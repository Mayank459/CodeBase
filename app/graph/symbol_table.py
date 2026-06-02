"""Symbol table module."""
class SymbolTable:

    def __init__(self):

        self.functions = {}

        self.classes = {}

        self.methods = {}

    def register_function(
        self,
        name,
        graph_node
    ):
        self.functions[name] = graph_node

    def register_class(
        self,
        name,
        graph_node
    ):
        self.classes[name] = graph_node

    def register_method(
        self,
        name,
        graph_node
    ):
        self.methods[name] = graph_node