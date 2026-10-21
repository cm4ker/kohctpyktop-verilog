module positive_edge_detector(input wire in, output wire out);
    wire o1, o2;
    transistor_n tr1(.s(1'b1), .g(in), .d(o1)),
                 tr2(.s(1'b1), .g(in), .d(o2));
    transistor_p tr3(.s(o1), .g(o2), .d(out));
endmodule
