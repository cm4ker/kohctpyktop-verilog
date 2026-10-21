module rs_trigger(input r, input s, output out);
    wire set_node, hold_node;
    transistor_n setN(.s(1'b1), .g(s), .d(set_node)), holdN(.s(1'b1), .g(out), .d(hold_node));
    transistor_p setP(.s(set_node), .g(r), .d(out)), holdP(.s(hold_node), .g(r), .d(out));
endmodule
