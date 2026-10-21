module por #(parameter DEPTH=10)(output out, output pre_out);
    generate if (DEPTH == 1) begin
        assign pre_out = 1'b1;
        transistor_n stage(.s(1'b1), .g(1'b1), .d(out));
    end else begin
        delay_line #(.DEPTH(DEPTH-1)) delay(.in(1'b1), .out(pre_out));
        transistor_n stage(.s(pre_out), .g(pre_out), .d(out));
    end endgenerate
endmodule
