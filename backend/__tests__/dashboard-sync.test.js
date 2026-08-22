const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const readRepoFile = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('dashboard opportunity synchronization', () => {
  test('B2B dashboard filters only by fields available in the production schema', () => {
    const dashboardApi = readRepoFile('backend/api/dashboard.js');
    const b2bBlock = dashboardApi.slice(
      dashboardApi.indexOf("if (type === 'b2b')"),
      dashboardApi.indexOf("if (type === 'seller'")
    );

    expect(b2bBlock).toContain('const b2bOpportunityFilter = { b2gStage: null };');
    expect(b2bBlock).not.toContain('projectClientType');
    expect(b2bBlock).toContain("company: { clientType: 'B2B' }");
    expect(b2bBlock).toContain('prisma.opportunity.count({ where: { ...whereClause } })');
  });

  test('B2G dashboard uses canonical opportunities instead of the Kanban search result', () => {
    const b2gPage = readRepoFile('apps/web/src/pages/B2GEditais.jsx');
    const dashboardSourceBlock = b2gPage.slice(
      b2gPage.indexOf('const dashboardSourceOpportunities'),
      b2gPage.indexOf('const dashboardTotals')
    );

    expect(dashboardSourceBlock).toContain('return opportunities.filter');
    expect(dashboardSourceBlock).not.toContain('sortedFilteredOpportunities.map');
    expect(b2gPage).toContain("window.setInterval(refreshB2GOpportunities, 30000)");
  });
});
