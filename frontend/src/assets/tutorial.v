module top (
    rst,
    clk
    toggle
);

    input wire rst;
    input wire clk;
    output wire toggle;

    reg out;
    reg [31:0] counter;

    assign toggle = out;

    always @ (posedge clk) begin
        if (rst) begin
            out <= 1;
            counter <= 0;
        end else begin
            if (counter == 32'd4_000_000) begin
                counter <= 0;
                out <= ~out;
            end else begin
                counter <= counter + 1;
            end
        end
    end

endmodule