"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProposalApprovalInfo } from '@/components/proposals/ProposalApprovalInfo';
import { Check, Download, Printer } from 'lucide-react';

interface CommercialProposalViewProps {
  partners?: any[];
  proposal?: any;
}

/**
 * CommercialProposalView
 * 
 * Componente para visualização e exportação de propostas comerciais.
 * 
 * Funcionalidades:
 * - Visualização profissional em 2 páginas (Capa + Detalhes)
 * - Exportação para PDF com layout completo
 * - Exibição detalhada de descontos aplicados
 * - Cálculo automático de totais com descontos
 * - Suporte a múltiplas estruturas de dados (camelCase e snake_case)
 * 
 * Estrutura de Descontos:
 * - applySalespersonDiscount: boolean (desconto vendedor 5%)
 * - appliedDirectorDiscountPercentage: number (desconto diretoria 0-100%)
 * - baseTotalMonthly: number (valor original sem descontos)
 * - totalMonthly: number (valor final com descontos)
 */
const CommercialProposalView: React.FC<CommercialProposalViewProps> = ({ proposal }) => {
  // Debug: verificar se os descontos estão chegando corretamente
  console.log('🔍 Proposta recebida:', {
    id: proposal?.id,
    baseId: proposal?.baseId,
    applySalespersonDiscount: proposal?.applySalespersonDiscount,
    appliedDirectorDiscountPercentage: proposal?.appliedDirectorDiscountPercentage,
    baseTotalMonthly: proposal?.baseTotalMonthly,
    totalMonthly: proposal?.totalMonthly,
    metadata: proposal?.metadata
  });

  const [proposalData, setProposalData] = useState({
    // Suporte para múltiplas estruturas de dados:
    // 1. Calculadoras salvam: clientData (objeto) e accountManagerData (objeto)
    // 2. Mock API usa: client (objeto) e accountManager (objeto)  
    // 3. Prisma armazena: client_data e account_manager (com underscore)
    clientName: proposal?.clientData?.name || proposal?.clientData?.companyName ||
      proposal?.client_data?.name || proposal?.client_data?.companyName || '',
    clientProject: proposal?.clientData?.projectName || proposal?.client_data?.projectName || '',
    clientEmail: proposal?.clientData?.email || proposal?.client_data?.email || '',
    clientPhone: proposal?.clientData?.phone || proposal?.client_data?.phone || '',
    clientContact: proposal?.clientData?.contact || proposal?.client_data?.contact || '',
    accountManagerName: proposal?.accountManager?.name || proposal?.accountManagerData?.name ||
      (typeof proposal?.accountManager === 'string' ? proposal?.accountManager : '') || '',
    accountManagerEmail: proposal?.accountManager?.email || proposal?.accountManagerData?.email || '',
    accountManagerPhone: proposal?.accountManager?.phone || proposal?.accountManagerData?.phone || '',
    date: proposal?.date || new Date().toLocaleDateString('pt-BR'),
    productType: proposal?.type || 'Máquinas Virtuais',
    serviceImage: null as string | null,
    logoImage: null as string | null
  });

  const [showForm, setShowForm] = useState(false);

  const productTypes = ['Máquinas Virtuais', 'Datacenter', 'Firewall', 'Cloud', 'Segurança', 'Rede', 'Internet Fibra', 'PABX SIP'];

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      // Importar dinamicamente jsPDF e html2canvas
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      // Ocultar botões antes de capturar
      const noPrintElements = document.querySelectorAll('.no-print');
      noPrintElements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      // Capturar todas as páginas da proposta
      const pages = document.querySelectorAll('.proposal-page');
      const pdf = new jsPDF('p', 'mm', 'a4');

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Capturar a página como imagem
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Adicionar nova página se não for a primeira
        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      // Salvar o PDF
      const fileName = `Proposta_Comercial_${proposalData.clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      // Restaurar visibilidade dos botões
      noPrintElements.forEach(el => {
        (el as HTMLElement).style.display = '';
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Por favor, tente novamente.');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProposalData(prev => ({ ...prev, serviceImage: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProposalData(prev => ({ ...prev, logoImage: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .proposal-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="space-y-6">

      {/* Botão oculto para download - acionado externamente */}
      <button 
        data-download-pdf 
        onClick={handleDownload}
        className="hidden"
        aria-hidden="true"
      />

      {/* Formulário de edição (opcional) */}
      {showForm && (
        <div className="mb-6 no-print">
          <Button 
            variant="outline" 
            onClick={() => setShowForm(false)}
            className="mb-4"
          >
            Ocultar Formulário
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="no-print">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="clientName">Nome do Cliente</Label>
                <Input
                  id="clientName"
                  value={proposalData.clientName}
                  onChange={(e) => setProposalData(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="Digite o nome do cliente"
                />
              </div>
              <div>
                <Label htmlFor="clientProject">Projeto</Label>
                <Input
                  id="clientProject"
                  value={proposalData.clientProject}
                  onChange={(e) => setProposalData(prev => ({ ...prev, clientProject: e.target.value }))}
                  placeholder="Nome do projeto"
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Email do Cliente</Label>
                <Input
                  id="clientEmail"
                  value={proposalData.clientEmail}
                  onChange={(e) => setProposalData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  placeholder="email@cliente.com"
                />
              </div>
              <div>
                <Label htmlFor="clientPhone">Telefone do Cliente</Label>
                <Input
                  id="clientPhone"
                  value={proposalData.clientPhone}
                  onChange={(e) => setProposalData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="clientContact">Contato</Label>
                <Input
                  id="clientContact"
                  value={proposalData.clientContact}
                  onChange={(e) => setProposalData(prev => ({ ...prev, clientContact: e.target.value }))}
                  placeholder="Nome do contato"
                />
              </div>
              <div>
                <Label htmlFor="accountManagerName">Gerente de Contas</Label>
                <Input
                  id="accountManagerName"
                  value={proposalData.accountManagerName}
                  onChange={(e) => setProposalData(prev => ({ ...prev, accountManagerName: e.target.value }))}
                  placeholder="Nome do gerente"
                />
              </div>
              <div>
                <Label htmlFor="accountManagerEmail">Email do Gerente</Label>
                <Input
                  id="accountManagerEmail"
                  value={proposalData.accountManagerEmail}
                  onChange={(e) => setProposalData(prev => ({ ...prev, accountManagerEmail: e.target.value }))}
                  placeholder="gerente@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="accountManagerPhone">Telefone do Gerente</Label>
                <Input
                  id="accountManagerPhone"
                  value={proposalData.accountManagerPhone}
                  onChange={(e) => setProposalData(prev => ({ ...prev, accountManagerPhone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={proposalData.date}
                  onChange={(e) => setProposalData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="productType">Tipo de Produto</Label>
                <Select
                  value={proposalData.productType}
                  onValueChange={(value) => setProposalData(prev => ({ ...prev, productType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campo de upload de imagem */}
            <div className="mt-4">
              <Label htmlFor="serviceImage">Imagem do Serviço</Label>
              <div className="mt-2">
                <Input
                  id="serviceImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione uma imagem do serviço vendido (JPG, PNG, etc.)
                </p>
              </div>
            </div>

            {/* Campo de upload do logo */}
            <div className="mt-4">
              <Label htmlFor="logoImage">Logo da Empresa</Label>
              <div className="mt-2">
                <Input
                  id="logoImage"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione o logo da empresa (JPG, PNG, etc.)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposta Comercial - Página 1 */}
      <div className="proposal-page bg-white border rounded-lg shadow-lg print:shadow-none print:border-none" style={{
        width: '210mm',
        height: '297mm',
        margin: '0 auto',
        pageBreakAfter: 'always',
        pageBreakInside: 'avoid'
      }}>
        <div className="relative h-full w-full" style={{
          backgroundImage: `url('https://st4.depositphotos.com/1025323/27146/i/450/depositphotos_271460380-stock-photo-perspectives-of-virtual-world.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}>

          {/* Overlay escuro para melhorar legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-blue-800/80"></div>

          {/* Padrão de grade sutil sobre a imagem */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}></div>
          </div>

          {/* Logo no canto superior direito */}
          <div className="absolute top-8 right-8">
            <div className="bg-blue-900 border-2 border-white rounded-lg p-4 w-40 h-40 flex flex-col items-center justify-center overflow-hidden">
              {proposalData.logoImage ? (
                // Logo carregado pelo usuário
                <div className="w-full h-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proposalData.logoImage}
                    alt="Logo da Empresa"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                // Logo padrão "double"
                <>
                  {/* Ícone de elos de corrente */}
                  <div className="flex items-center justify-center mb-1">
                    <div className="w-4 h-4 border-2 border-white rounded-full mr-1"></div>
                    <div className="w-4 h-4 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="text-white font-bold text-lg">double</div>
                  <div className="text-white text-xs">ti + telecom</div>
                </>
              )}
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="p-12 text-white">
            {/* Título Principal */}
            <div className="mb-8">
              <h1 className="text-6xl font-bold text-blue-200 leading-tight">
                Proposta<br />Comercial
              </h1>
            </div>

            {/* Informações do Cliente */}
            <div className="mb-8">
              <div className="text-xl mb-2">{proposalData.clientName || 'Nome do Cliente'}</div>
              <div className="text-lg opacity-90">{proposalData.date}</div>
              {proposalData.clientProject && (
                <div className="text-md opacity-80 mt-1">Projeto: {proposalData.clientProject}</div>
              )}
            </div>

            {/* Linha divisória */}
            <div className="border-t border-white opacity-30 mb-8"></div>

            {/* Produto */}
            <div className="space-y-4">
              <div className="text-xl font-semibold mb-4">Produto:</div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-blue-900" />
                </div>
                <span className="text-lg font-semibold">{proposalData.productType}</span>
              </div>
              
              {/* Descontos Aplicados - Resumo */}
              {(proposal?.applySalespersonDiscount || proposal?.appliedDirectorDiscountPercentage > 0) && (
                <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-sm font-semibold mb-2 text-blue-100">Descontos Especiais:</div>
                  <div className="space-y-1">
                    {proposal.applySalespersonDiscount && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="w-4 h-4 text-green-300" />
                        <span>Desconto Vendedor: 5%</span>
                      </div>
                    )}
                    {proposal.appliedDirectorDiscountPercentage > 0 && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="w-4 h-4 text-green-300" />
                        <span>Desconto Diretoria: {proposal.appliedDirectorDiscountPercentage}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Linha divisória */}
            <div className="border-t border-white opacity-30 mt-8"></div>
          </div>

          {/* Imagem do Serviço */}
          <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2">
            <div className="w-[500px] h-[375px] bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg border-2 border-white overflow-hidden">
              {proposalData.serviceImage ? (
                // Imagem carregada pelo usuário
                <div className="h-full w-full relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proposalData.serviceImage}
                    alt="Imagem do Serviço"
                    className="h-full w-full object-cover"
                  />
                  {/* Overlay com texto sobre a imagem */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-transparent flex items-end">
                    <div className="text-center text-white p-4 w-full">
                      <div className="text-2xl font-bold mb-2">{proposalData.productType}</div>
                      <div className="text-sm opacity-90">Infraestrutura de Alta Tecnologia</div>
                    </div>
                  </div>
                </div>
              ) : (
                // Simulação padrão do datacenter
                <div className="h-full bg-gradient-to-b from-blue-500 to-blue-700 flex items-center justify-center relative">
                  {/* Simulação de corredor de datacenter com racks de servidor */}
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-600 to-blue-800">
                    {/* Racks de servidor à esquerda */}
                    <div className="absolute left-2 top-2 w-1 h-44 bg-blue-300 opacity-80"></div>
                    <div className="absolute left-4 top-2 w-1 h-44 bg-blue-300 opacity-80"></div>
                    <div className="absolute left-6 top-2 w-1 h-44 bg-blue-300 opacity-80"></div>
                    <div className="absolute left-8 top-2 w-1 h-44 bg-blue-300 opacity-80"></div>
                    <div className="absolute left-10 top-2 w-1 h-44 bg-blue-300 opacity-80"></div>

                    {/* Racks de servidor à direita */}
                    <div className="absolute right-2 top-2 w-1 h-44 bg-blue-300 opacity-80"></div>
                    <div className="absolute right-4 top-2 w-1 h-44 bg-blue-300 opacity-80"></div>
                    <div className="absolute right-6 top-2 w-1 h-44 bg-blue-300 opacity-80"></div>
                    <div className="absolute right-8 top-2 w-1 h-44 bg-blue-300 opacity-80"></div>
                    <div className="absolute right-10 top-2 w-1 h-44 bg-blue-300 opacity-80"></div>

                    {/* Luzes azuis nos racks */}
                    <div className="absolute left-3 top-8 w-1 h-1 bg-blue-200 rounded-full animate-pulse"></div>
                    <div className="absolute left-5 top-12 w-1 h-1 bg-blue-200 rounded-full animate-pulse"></div>
                    <div className="absolute left-7 top-16 w-1 h-1 bg-blue-200 rounded-full animate-pulse"></div>
                    <div className="absolute left-9 top-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse"></div>

                    <div className="absolute right-3 top-8 w-1 h-1 bg-blue-200 rounded-full animate-pulse"></div>
                    <div className="absolute right-5 top-12 w-1 h-1 bg-blue-200 rounded-full animate-pulse"></div>
                    <div className="absolute right-7 top-16 w-1 h-1 bg-blue-200 rounded-full animate-pulse"></div>
                    <div className="absolute right-9 top-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-center text-white relative z-10">
                    <div className="text-2xl font-bold mb-2">{proposalData.productType}</div>
                    <div className="text-sm opacity-80">Infraestrutura de Alta Tecnologia</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QR Code e Contato */}
          <div className="absolute bottom-8 left-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                {/* QR Code simulado */}
                <div className="w-12 h-12 bg-gray-800 rounded grid grid-cols-8 grid-rows-8 gap-0.5 p-1">
                  {/* Padrão de QR Code */}
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>

                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>

                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>

                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>

                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>

                  <div className="bg-white"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>

                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                  <div className="bg-white"></div>
                </div>
              </div>
              <div className="text-white">
                <div className="font-semibold text-lg">Visite Nosso Site</div>
                <div className="text-sm opacity-90">www.doubletelecom.com.br</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda Página - Dados Detalhados */}
      <div className="proposal-page bg-white border rounded-lg shadow-lg print:shadow-none print:border-none mt-6" style={{
        width: '210mm',
        height: '297mm',
        margin: '0 auto',
        pageBreakAfter: 'always',
        pageBreakInside: 'avoid'
      }}>
        <div className="p-12 h-full">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Proposta Comercial</h1>
              <p className="text-gray-600">{proposalData.productType}</p>
              <ProposalApprovalInfo proposal={proposal} className="text-gray-600 text-sm mt-1" />
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Data: {proposalData.date}</div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Dados do Cliente</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Nome:</strong> {proposalData.clientName || 'N/A'}</p>
              <p><strong>Projeto:</strong> {proposalData.clientProject || 'N/A'}</p>
              <p><strong>Email:</strong> {proposalData.clientEmail || 'N/A'}</p>
              <p><strong>Telefone:</strong> {proposalData.clientPhone || 'N/A'}</p>
              <p><strong>Contato:</strong> {proposalData.clientContact || 'N/A'}</p>
            </div>
          </div>

          {/* Gerente de Contas */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Gerente de Contas</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Nome:</strong> {proposalData.accountManagerName || 'N/A'}</p>
              <p><strong>Email:</strong> {proposalData.accountManagerEmail || 'N/A'}</p>
              <p><strong>Telefone:</strong> {proposalData.accountManagerPhone || 'N/A'}</p>
            </div>
          </div>

          {/* Produtos e Serviços */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Produtos e Serviços</h3>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Descrição</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Setup</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Mensal</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Descontos</th>
                </tr>
              </thead>
              <tbody>
                {proposal?.products && Array.isArray(proposal.products) && proposal.products.length > 0 ? (
                  proposal.products.map((product: any, index: number) => {
                    // Descontos são globais da proposta, não por produto
                    const hasDiscounts = proposal.applySalespersonDiscount || proposal.appliedDirectorDiscountPercentage > 0;
                    let discountText = '';
                    if (proposal.applySalespersonDiscount && proposal.appliedDirectorDiscountPercentage > 0) {
                      discountText = `Vendedor: 5%\nDiretoria: ${proposal.appliedDirectorDiscountPercentage}%`;
                    } else if (proposal.applySalespersonDiscount) {
                      discountText = 'Vendedor: 5%';
                    } else if (proposal.appliedDirectorDiscountPercentage > 0) {
                      discountText = `Diretoria: ${proposal.appliedDirectorDiscountPercentage}%`;
                    }
                    
                    return (
                      <tr key={index}>
                        <td className="border border-gray-300 px-4 py-2">
                          {product.description || proposalData.productType}
                          {product.details?.speed && ` - ${product.details.speed} Mbps`}
                          {product.details?.contractTerm && ` (${product.details.contractTerm} meses)`}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {product.setup ? `R$ ${product.setup.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {product.monthly ? `R$ ${product.monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 whitespace-pre-line">
                          {hasDiscounts ? (
                            <span className="text-green-700 font-medium">{discountText}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-gray-300 px-4 py-2 text-center text-gray-500">
                      {!proposal?.products ? (
                        <div className="py-4">
                          <p className="font-semibold text-red-600">⚠️ Nenhum produto encontrado nesta proposta</p>
                          <p className="text-sm mt-2">Os produtos podem não ter sido salvos corretamente.</p>
                        </div>
                      ) : (
                        <div className="py-4">
                          <p>Nenhum produto adicionado</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Descontos Aplicados */}
          {(proposal?.applySalespersonDiscount || proposal?.appliedDirectorDiscountPercentage > 0) && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Descontos Aplicados</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                {proposal.applySalespersonDiscount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      <strong>Desconto do Vendedor</strong>
                    </span>
                    <span className="text-green-700 font-semibold">5%</span>
                  </div>
                )}
                {proposal.appliedDirectorDiscountPercentage > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      <strong>Desconto da Diretoria</strong>
                    </span>
                    <span className="text-green-700 font-semibold">
                      {proposal.appliedDirectorDiscountPercentage}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resumo Financeiro Detalhado */}
          {proposal?.products && proposal.products.length > 0 && (() => {
            // Calcular total de setup (não recebe descontos)
            const totalSetup = proposal.products.reduce((sum: number, p: any) => sum + (p.setup || 0), 0);
            
            // Valor mensal final (já com descontos aplicados)
            const totalMensalFinal = proposal.totalMonthly || proposal.products.reduce((sum: number, p: any) => sum + (p.monthly || 0), 0);
            
            /**
             * Recuperar valor mensal original (sem descontos)
             * 
             * Prioridade:
             * 1. Usar baseTotalMonthly do metadata (mais confiável)
             * 2. Se não disponível e houver descontos, reverter cálculo
             * 3. Se não houver descontos, usar valor final
             */
            let totalMensalSemDescontos = proposal.baseTotalMonthly || totalMensalFinal;
            
            // Verificar se há descontos aplicados
            const hasDiscounts = proposal.applySalespersonDiscount || proposal.appliedDirectorDiscountPercentage > 0;
            
            // Se não tiver baseTotalMonthly mas tiver descontos, reverter o cálculo
            if (hasDiscounts && !proposal.baseTotalMonthly) {
              totalMensalSemDescontos = totalMensalFinal;
              
              // Reverter desconto da diretoria (aplicado por último)
              if (proposal.appliedDirectorDiscountPercentage > 0) {
                totalMensalSemDescontos = totalMensalSemDescontos / (1 - proposal.appliedDirectorDiscountPercentage / 100);
              }
              
              // Reverter desconto do vendedor (aplicado primeiro)
              if (proposal.applySalespersonDiscount) {
                totalMensalSemDescontos = totalMensalSemDescontos / 0.95;
              }
            }
            
            // Calcular total de descontos e percentual
            const totalDescontos = totalMensalSemDescontos - totalMensalFinal;
            const percentualDesconto = totalMensalSemDescontos > 0 ? (totalDescontos / totalMensalSemDescontos * 100) : 0;
            
            return (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Resumo Financeiro Detalhado</h3>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-5">
                  <table className="w-full">
                    <tbody>
                      {/* Setup */}
                      <tr className="border-b-2 border-gray-300">
                        <td className="py-3 text-sm font-bold text-gray-800">Total Setup (Instalação):</td>
                        <td className="py-3 text-sm text-right font-bold text-gray-900">
                          R$ {totalSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      
                      {/* Valor Mensal Original */}
                      {hasDiscounts && (
                        <tr className="border-b border-gray-200">
                          <td className="py-2 text-sm text-gray-600">Valor Mensal (sem descontos):</td>
                          <td className="py-2 text-sm text-right text-gray-700 line-through">
                            R$ {totalMensalSemDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}
                      
                      {/* Descontos Detalhados */}
                      {hasDiscounts && (
                        <>
                          <tr className="bg-green-50 border-b border-green-200">
                            <td className="py-2 text-sm font-semibold text-green-800" colSpan={2}>
                              Descontos Aplicados:
                            </td>
                          </tr>
                          
                          {/* Desconto Vendedor */}
                          {proposal.applySalespersonDiscount && (() => {
                            const descontoVendedor = totalMensalSemDescontos * 0.05;
                            
                            return (
                              <tr className="border-b border-gray-100">
                                <td className="py-1 text-xs text-gray-700 pl-4">
                                  • Desconto Vendedor (5%)
                                </td>
                                <td className="py-1 text-xs text-right text-green-700 font-medium">
                                  -R$ {descontoVendedor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })()}
                          
                          {/* Desconto Diretoria */}
                          {proposal.appliedDirectorDiscountPercentage > 0 && (() => {
                            // Calcular sobre o valor já com desconto vendedor (se aplicável)
                            const valorBase = proposal.applySalespersonDiscount 
                              ? totalMensalSemDescontos * 0.95 
                              : totalMensalSemDescontos;
                            const descontoDiretoria = valorBase * (proposal.appliedDirectorDiscountPercentage / 100);
                            
                            return (
                              <tr className="border-b border-gray-100">
                                <td className="py-1 text-xs text-gray-700 pl-4">
                                  • Desconto Diretoria ({proposal.appliedDirectorDiscountPercentage}%)
                                </td>
                                <td className="py-1 text-xs text-right text-green-700 font-medium">
                                  -R$ {descontoDiretoria.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })()}
                          
                          {/* Total de Descontos */}
                          <tr className="bg-green-100 border-b-2 border-green-300">
                            <td className="py-2 text-sm font-bold text-green-800">Total de Descontos ({percentualDesconto.toFixed(1)}%):</td>
                            <td className="py-2 text-sm text-right font-bold text-green-700">
                              -R$ {totalDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </>
                      )}
                      
                      {/* Valor Final */}
                      <tr className="bg-blue-50 border-b-2 border-blue-300">
                        <td className="py-3 text-base font-bold text-blue-900">
                          Valor Mensal Final {hasDiscounts ? '(com descontos)' : ''}:
                        </td>
                        <td className="py-3 text-base text-right font-bold text-blue-900">
                          R$ {totalMensalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    {proposal.products.some((p: any) => p.details?.contractTerm) && (
                      <tr>
                        <td className="py-2 text-sm font-medium text-gray-700">Prazo Contratual:</td>
                        <td className="py-2 text-sm text-right font-semibold text-gray-900">
                          {proposal.products[0].details.contractTerm} meses
                        </td>
                      </tr>
                    )}
                    {proposal.baseId && (
                      <tr>
                        <td className="py-2 text-sm font-medium text-gray-700">ID da Proposta:</td>
                        <td className="py-2 text-sm text-right font-semibold text-gray-900">
                          {proposal.baseId}
                        </td>
                      </tr>
                    )}
                    {proposal.version && (
                      <tr>
                        <td className="py-2 text-sm font-medium text-gray-700">Versão:</td>
                        <td className="py-2 text-sm text-right font-semibold text-gray-900">
                          {proposal.version}
                        </td>
                      </tr>
                    )}
                    {proposal.date && (
                      <tr>
                        <td className="py-2 text-sm font-medium text-gray-700">Data da Proposta:</td>
                        <td className="py-2 text-sm text-right font-semibold text-gray-900">
                          {new Date(proposal.date).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}

          {/* Rodapé */}
          <div className="absolute bottom-12 left-12 right-12">
            <div className="border-t border-gray-300 pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Double TI + Telecom</p>
                  <p className="text-sm text-gray-600">www.doubletelecom.com.br</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Página 2 de 2</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Navegação - Removidos pois não são necessários para visualização em tela */}
      {/* A impressão e exportação PDF já geram o documento completo com todas as páginas */}
    </div>
    </>
  );
};

export default CommercialProposalView;
