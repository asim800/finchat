# Chart Design Architecture

This document outlines the rationale and design approach for the dual chart system in the finance application.

## Overview

The application implements a **dual chart architecture** to support both simple and advanced financial visualizations. This design separates basic portfolio charts from complex analytical dashboards, each optimized for different use cases and data sources.

## Chart Data Structure

### Base Interface
```typescript
interface ChartData {
  type: 'pie' | 'bar' | 'figure';
  title: string;
  data?: Array<{ name: string; value: number }>;      // For simple charts
  figureData?: {                                       // For advanced visualizations
    type: 'svg' | 'interactive';
    content: string;
    width?: number;
    height?: number;
  };
}
```

## Two-Container System Rationale

### Container 1: `chartData.data` - Simple Chart Data

**Purpose**: Basic portfolio visualization using client-side rendering

**Structure**: Array of name-value pairs
```typescript
data: [
  { name: 'AAPL', value: 5000 },
  { name: 'GOOGL', value: 3000 },
  { name: 'MSFT', value: 2000 }
]
```

**Use Cases**:
- Portfolio allocation pie charts
- Basic asset distribution
- Quick visual portfolio overview
- Guest mode demonstrations

**Rendering**: Recharts library (React components)

**Advantages**:
- ✅ Lightweight and fast
- ✅ Interactive (hover, click events)
- ✅ Responsive design
- ✅ No server computation required
- ✅ Works offline

**Limitations**:
- ❌ Limited to basic chart types
- ❌ No advanced financial metrics
- ❌ Simple styling options

### Container 2: `chartData.figureData` - Advanced Visualizations

**Purpose**: Complex financial dashboards with professional-grade analytics

**Structure**: Complete SVG markup with embedded data
```typescript
figureData: {
  type: 'svg',
  content: `<?xml version="1.0" encoding="utf-8"?>
            <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
              <!-- Complex multi-panel dashboard -->
            </svg>`,
  width: 800,
  height: 600
}
```

**Use Cases**:
- Portfolio risk analysis dashboards
- Monte Carlo simulation results
- Portfolio optimization comparisons
- Multi-metric financial displays
- Professional reporting

**Rendering**: Direct SVG injection (server-generated content)

**Advantages**:
- ✅ Rich, complex visualizations
- ✅ Multiple metrics in single view
- ✅ Professional styling and branding
- ✅ Precise mathematical layouts
- ✅ Consistent cross-browser rendering
- ✅ Print-ready quality

**Limitations**:
- ❌ Requires server-side computation
- ❌ Less interactive than Recharts
- ❌ Larger payload size
- ❌ Needs backend availability

## Data Flow Architecture

### Simple Chart Flow
```
Frontend Portfolio Data → Client Calculation → Recharts Rendering → Browser Display
```

**Process**:
1. User portfolio holdings retrieved from database
2. Frontend calculates allocation percentages
3. Recharts library renders interactive chart
4. Real-time updates possible

### Advanced Chart Flow
```
User Query → FastAPI Backend → Financial Analysis → Matplotlib Generation → SVG Creation → Frontend Display
```

**Process**:
1. User requests portfolio analysis ("analyze risk of my portfolio")
2. Query routed to FastAPI microservice via ChatTriageProcessor
3. Backend performs complex calculations (VaR, Sharpe ratio, correlations)
4. Python matplotlib generates professional dashboard
5. SVG content returned through UnifiedAnalysisService
6. Frontend displays complete visualization

## Chart Type Decision Matrix

| Scenario | Chart Type | Data Container | Rationale |
|----------|------------|----------------|-----------|
| Portfolio allocation view | `pie` | `data` | Simple, fast, interactive |
| Asset performance comparison | `bar` | `data` | Clear comparison, lightweight |
| Risk analysis dashboard | `figure` | `figureData` | Complex metrics, professional layout |
| Monte Carlo simulation | `figure` | `figureData` | Statistical visualization requirements |
| Portfolio optimization | `figure` | `figureData` | Multi-dimensional comparison needs |
| Guest mode demonstration | `pie` | `data` | No backend computation required |

## Implementation Strategy

### Frontend Components

**ChartDisplay Component**: Universal renderer supporting both data types
```typescript
switch (data.type) {
  case 'figure':
    return <SVGRenderer content={data.figureData.content} />;
  case 'pie':
  case 'bar':
    return <RechartsRenderer data={data.data} type={data.type} />;
}
```

**PortfolioChartPanel Component**: Container with adaptive footer
```typescript
// Adaptive item count display
{chartData.type === 'figure' ? (
  chartData.figureData ? 'Interactive Dashboard' : 'Figure Display'
) : (
  `Showing ${chartData.data?.length || 0} items`
)}
```

### Backend Integration

**ChatTriageProcessor**: Routes analytical queries to appropriate backend
```typescript
if (needsFinancialAnalysis && context.userId) {
  // Route to FastAPI for figure generation
  const analysisResult = await unifiedAnalysisService.analyzeQuery(query, userId, portfolios);
  return { ...result, metadata: { analysisData: analysisResult.rawAnalysisData } };
}
```

**UnifiedAnalysisService**: Manages FastAPI communication and figure data flow
```typescript
return {
  content: result.formattedData,
  backend: 'fastapi',
  rawAnalysisData: result.rawAnalysisData // Contains figure_data for visualization
};
```

## Design Principles

### 1. **Progressive Enhancement**
- Basic functionality works with simple charts
- Advanced features enhance experience when backend available
- Graceful degradation to fallback visualizations

### 2. **Performance Optimization**
- Simple charts for immediate user feedback
- Complex charts only when analytical depth required
- Async loading of advanced visualizations

### 3. **User Experience Continuity**
- Consistent interface regardless of chart complexity
- Unified styling and interaction patterns
- Seamless transitions between chart types

### 4. **Scalability**
- Backend-generated charts reduce frontend complexity
- Server-side computation scales independently
- Chart templates reusable across different analyses

### 5. **Professional Quality**
- Simple charts for quick insights
- Advanced charts for professional reporting
- Print and export capabilities

## Future Considerations

### Planned Enhancements
- **Interactive Figures**: Hybrid approach combining SVG with React event handlers
- **Chart Templates**: Configurable dashboard layouts
- **Export Functionality**: PDF, PNG, and data export capabilities
- **Real-time Updates**: Live data integration for both chart types

### Technical Evolution
- **Chart Caching**: Server-side figure caching for performance
- **Client Hydration**: Progressive enhancement of server-generated charts
- **Accessibility**: Screen reader support for complex visualizations
- **Mobile Optimization**: Responsive figure scaling

## Conclusion

The dual chart architecture provides the flexibility to serve both immediate user needs (simple, fast charts) and advanced analytical requirements (complex, professional dashboards). This separation of concerns enables optimal performance, user experience, and maintainability while supporting the application's evolution from basic portfolio tracking to sophisticated financial analysis platform.

The design successfully balances:
- **Simplicity** vs **Sophistication**
- **Performance** vs **Features**
- **Client-side** vs **Server-side** processing
- **Interactivity** vs **Professional presentation**

This architecture positions the application to serve both casual investors seeking quick portfolio overviews and professional users requiring detailed financial analysis and reporting capabilities.