import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOwnerUUID } from '@/lib/get-owner-uuid';
import type {
  InvestmentPosition,
  PositionDetailed,
  CreatePositionInput,
  UpdatePositionInput,
  TipoConta
} from '@/types/investments';

export function useInvestments(tipoConta: TipoConta) {
  const [positions, setPositions] = useState<PositionDetailed[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    try {
      setLoading(true);
      // Limpar posições anteriores ao trocar tipo_conta
      setPositions([]);

      const supabase = createClient();

      // Usar getOwnerUUID para garantir que dependentes usem o UUID do principal
      // (mesmo padrão que transações, contas, cartões etc.)
      const ownerUUID = await getOwnerUUID();
      if (!ownerUUID) return;

      // Usar a view que já tem todos os cálculos
      const { data, error } = await supabase
        .from('v_positions_detailed')
        .select('*')
        .eq('usuario_id', ownerUUID)
        .eq('tipo_conta', tipoConta)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPositions(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [tipoConta]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const createPosition = async (input: CreatePositionInput) => {
    const supabase = createClient();
    const ownerUUID = await getOwnerUUID();
    if (!ownerUUID) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('investment_positions')
      .insert({
        ...input,
        usuario_id: ownerUUID,
        tipo_conta: tipoConta,
      });

    if (error) throw error;

    await fetchPositions();
    window.dispatchEvent(new CustomEvent('investmentsChanged'));
    return true;
  };

  const consolidatePosition = async (existingPositionId: string, newQuantidade: number, newPrecoMedio: number) => {
    const supabase = createClient();
    const ownerUUID = await getOwnerUUID();
    if (!ownerUUID) throw new Error('Usuário não autenticado');

    // Buscar posição existente
    const { data: existingPosition, error: fetchError } = await supabase
      .from('investment_positions')
      .select('quantidade, preco_medio')
      .eq('id', existingPositionId)
      .eq('usuario_id', ownerUUID)
      .single();

    if (fetchError) throw fetchError;
    if (!existingPosition) throw new Error('Posição não encontrada');

    // Calcular novos valores consolidados
    const existingQtd = Number(existingPosition.quantidade);
    const existingPrice = Number(existingPosition.preco_medio);
    const existingTotal = existingQtd * existingPrice;

    const newTotal = newQuantidade * newPrecoMedio;
    const totalQuantidade = existingQtd + newQuantidade;
    const totalInvestido = existingTotal + newTotal;
    const novoPrecoMedio = totalInvestido / totalQuantidade;

    // Atualizar posição existente
    const { error: updateError } = await supabase
      .from('investment_positions')
      .update({
        quantidade: totalQuantidade,
        preco_medio: novoPrecoMedio,
      })
      .eq('id', existingPositionId)
      .eq('usuario_id', ownerUUID);

    if (updateError) throw updateError;

    await fetchPositions();
    window.dispatchEvent(new CustomEvent('investmentsChanged'));
    return true;
  };

  const findExistingPosition = async (assetId: string) => {
    const supabase = createClient();
    const ownerUUID = await getOwnerUUID();
    if (!ownerUUID) return null;

    const { data, error } = await supabase
      .from('v_positions_detailed')
      .select('*')
      .eq('usuario_id', ownerUUID)
      .eq('asset_id', assetId)
      .eq('tipo_conta', tipoConta)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  const updatePosition = async (id: string, input: UpdatePositionInput) => {
    const supabase = createClient();
    const ownerUUID = await getOwnerUUID();
    if (!ownerUUID) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('investment_positions')
      .update(input)
      .eq('id', id)
      .eq('usuario_id', ownerUUID);

    if (error) throw error;

    await fetchPositions();
    window.dispatchEvent(new CustomEvent('investmentsChanged'));
    return true;
  };

  const deletePosition = async (id: string) => {
    const supabase = createClient();
    const ownerUUID = await getOwnerUUID();
    if (!ownerUUID) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('investment_positions')
      .delete()
      .eq('id', id)
      .eq('usuario_id', ownerUUID);

    if (error) throw error;

    await fetchPositions();
    window.dispatchEvent(new CustomEvent('investmentsChanged'));
    return true;
  };

  return {
    positions,
    loading,
    fetchPositions,
    refetch: fetchPositions,
    createPosition,
    consolidatePosition,
    findExistingPosition,
    updatePosition,
    deletePosition,
  };
}
