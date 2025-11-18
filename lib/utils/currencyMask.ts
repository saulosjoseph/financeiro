/**
 * Formata um valor numérico para o formato monetário brasileiro
 * @param value - String com o valor a ser formatado
 * @returns String formatada com pontos de milhar e vírgula para centavos
 */
export function formatCurrency(value: string): string {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '');
  
  // Se não há números, retorna vazio
  if (!numbers) return '';
  
  // Converte para número e divide por 100 para ter os centavos
  const numberValue = parseInt(numbers) / 100;
  
  // Formata com pontos de milhar e vírgula para centavos
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Remove a formatação de moeda e retorna apenas os números
 * @param value - String formatada com moeda
 * @returns String com apenas os dígitos
 */
export function parseCurrency(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  
  // Converte para número com centavos
  const numberValue = parseInt(numbers) / 100;
  return numberValue.toString();
}

/**
 * Hook para usar a máscara de moeda em inputs
 */
export function useCurrencyInput(initialValue: string = '') {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    e.target.value = formatted;
  };

  const getValue = (formattedValue: string): string => {
    return parseCurrency(formattedValue);
  };

  return { handleChange, getValue, formatCurrency, parseCurrency };
}
