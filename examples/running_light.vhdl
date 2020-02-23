library ieee;
    use ieee.std_logic_1164.all;
    use ieee.std_logic_unsigned.all;

entity mod_top is
    port (
        M_nRESET :in std_logic;
        CLK_100M :in std_logic;
        EXP_IO :out std_logic_vector (3 downto 0)
    );
end entity;
architecture rtl of mod_top is
    signal output :std_logic_vector (3 downto 0) := (0 => '1', others => '0');
    signal counter :std_logic_vector (31 downto 0) := (others => '0');
begin
    process (CLK_100M, M_nRESET) begin
        if (M_nRESET = '0') then
            output <= (0 => '1', others => '0');
            counter <= (others => '0');
        elsif (rising_edge(CLK_100M)) then
            if (counter = 1_000_000) then
                counter <= (others => '0');
                if (output(3) = '1') then
                    output <= (0 => '1', others => '0');
                else
                    output <= output(2 downto 0) & '0';
                end if;
            else
                counter <= counter + 1;
            end if;
        end if;
    end process;
    EXP_IO <= output;
end architecture;

