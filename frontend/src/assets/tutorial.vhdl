library ieee;
use ieee.std_logic_1164.all;
use ieee.std_logic_unsigned.all;

entity top is
    port (
        rst: in std_logic;
        clk: in std_logic;
        toggle: out std_logic;
    );
end entity;
architecture rtl of top is
    signal output :std_logic := '1';
    signal counter :std_logic_vector (31 downto 0) := (others => '0');
begin
    process (clk, rst) begin
        if (rst = '1') then
            output <= '1';
            counter <= (others => '0');
        elsif (rising_edge(clk)) then
            if (counter = 4_000_000) then
                counter <= (others => '0');
                output <= not output;
            else
                counter <= counter + 1
            end if;
        end if;
    end process;
    toggle <= output;
end architecture meow;
