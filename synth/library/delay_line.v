module delay_line #(parameter DEPTH=10)(input in, output out);
    generate if (DEPTH == 1) begin
        transistor_n stage(.s(in), .g(in), .d(out));
    end else begin
        wire mid;
        transistor_n stage(.s(in), .g(in), .d(mid));
        delay_line #(.DEPTH(DEPTH-1)) rest(.in(mid), .out(out));
    end endgenerate
endmodule
