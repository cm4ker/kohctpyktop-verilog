module root(input pin1, output pin8);
    positive_edge_detector edge1(.in(pin1), .out(pin8));
endmodule
