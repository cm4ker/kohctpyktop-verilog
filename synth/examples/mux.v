module root (
    input pin1, // A
    input pin2, // B
    input pin3, // C
    input pin4, // D
    input pin5, // S1
    input pin6, // S0
    output pin8 // Z
);
    wire [3:0] data = {pin4, pin3, pin2, pin1};
    wire [1:0] sel = {pin5, pin6};
    assign pin8 = data[sel];
endmodule
