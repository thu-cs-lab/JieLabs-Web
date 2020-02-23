library ieee;
    use ieee.std_logic_1164.all;
    use ieee.std_logic_unsigned.all;

entity mod_top is
    port (
        clk :in std_logic;
        rst :in std_logic;
        digital :out std_logic_vector (6 downto 0);
        odd :out std_logic_vector (3 downto 0);
        even :out std_logic_vector (3 downto 0)
    );
end entity;
architecture rtl of mod_top is
    signal counter :std_logic_vector (31 downto 0) := (others => '0');
    signal count :std_logic_vector (3 downto 0) := (others => '0');
    signal odd_reg :std_logic_vector (3 downto 0) := (others => '0');
    signal even_reg :std_logic_vector (3 downto 0) := (others => '0');

    component decoder is
    port (
        number :in std_logic_vector (3 downto 0);
        digital :out std_logic_vector (6 downto 0)
    );
    end component;
begin
    decoder_inst : decoder port map (count, digital);
    process (clk, rst) begin
        if (rst = '0') then
            count <= (others => '0');
            odd_reg <= (0 => '1', others => '0');
            even_reg <= (others => '0');
            counter <= (others => '0');
        elsif (rising_edge(clk)) then
            if (counter <= 1_048_576) then
                counter <= counter + 1;
            else
                counter <= (others => '0');
                if (count <= 8) then
                    count <= count + 1;
                else
                    count <= (others => '0');
                end if;

                if (odd_reg <= 8) then
                    odd_reg <= odd_reg + 2;
                else
                    odd_reg <= (0 => '1', others => '0');
                end if;
                if (even_reg <= 6) then
                    even_reg <= even_reg + 2;
                else
                    even_reg <= (others => '0');
                end if;
            end if;
        end if;
    end process;

    odd <= odd_reg;
    even <= even_reg;
end architecture;

library ieee;
    use ieee.std_logic_1164.all;
    use ieee.std_logic_unsigned.all;

entity decoder is
    port (
        number :in std_logic_vector (3 downto 0);
        digital :out std_logic_vector (6 downto 0)
    );
end entity;
architecture rtl of decoder is
begin
    process (number) begin
        case number is
            when "0000" =>
                digital <= "0111111";
            when "0001" =>
                digital <= "0000110";
            when "0010" =>
                digital <= "1011011";
            when "0011" =>
                digital <= "1001111";
            when "0100" =>
                digital <= "1100110";
            when "0101" =>
                digital <= "1101101";
            when "0110" =>
                digital <= "1111101";
            when "0111" =>
                digital <= "0000111";
            when "1000" =>
                digital <= "1111111";
            when "1001" =>
                digital <= "1101111";
            when others =>
                digital <= "0000000";
        end case;
    end process;
end architecture;