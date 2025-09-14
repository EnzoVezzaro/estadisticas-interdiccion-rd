document.addEventListener('DOMContentLoaded', () => {
    // Global state
    let arrestsData, seizuresData, casesData;
    let filteredData; // This seems unused, can be removed or clarified.

    // Pagination state and constants
    let currentCasesChartPage = 1;
    let currentCasesTablePage = 1;
    const ITEMS_PER_PAGE_CHART = 10;
    const ITEMS_PER_PAGE_TABLE = 10;

    const ARRESTS_PATH = 'data/DNCD-Estadisticas-de-Arrestos-por-edad-sexo-y-nacionalidad-2017-2025-1.txt';
    const SEIZURES_PATH = 'data/DNCD-Estadisticas-de-Drogas-Decomisadas-2017-2025-1.txt';
    const CASES_PATH = 'data/PGR-Estadísticas de Casos Sometidos Enero 2017-Octubre 2022.csv';

    // Chart instances
    let overviewChart, arrestsChart, seizuresChart, casesChart;

    // Helper function to determine the quarter from a month name
    function getQuarter(month) {
        const monthMap = {
            'Enero': 'Q1', 'Febrero': 'Q1', 'Marzo': 'Q1',
            'Abril': 'Q2', 'Mayo': 'Q2', 'Junio': 'Q2',
            'Julio': 'Q3', 'Agosto': 'Q3', 'Septiembre': 'Q3',
            'Octubre': 'Q4', 'Noviembre': 'Q4', 'Diciembre': 'Q4'
        };
        return monthMap[month] || 'Unknown'; // Return 'Unknown' for invalid month names
    }

    async function loadData() {
        const arrestsText = await fetch(ARRESTS_PATH).then(res => res.text());
        const seizuresText = await fetch(SEIZURES_PATH).then(res => res.text());

        // Custom parser for the non-standard TSV files
        const parseCustomTSV = (text) => {
            const lines = text.trim().split('\n');
            const header = lines.shift();
            const columns = ['Category', 'Quantity', 'Period', 'Year'];
            if (header.includes('Unidad de Medida')) {
                columns.unshift('Drug', 'Unit');
                columns.splice(2, 1); // remove 'Category'
            }
            
            return lines.map(line => {
                const values = line.split('\t');
                const entry = {};
                if (header.includes('Unidad de Medida')) {
                     const quantity = parseFloat(values[2]);
                     const year = parseInt(values[4], 10);
                     entry['Drug'] = values[0].trim();
                     entry['Unit'] = values[1].trim();
                     entry['Quantity'] = isNaN(quantity) ? 0 : quantity;
                     entry['Period'] = values[3].trim();
                     entry['Year'] = isNaN(year) ? 0 : year;
                } else {
                    const quantity = parseInt(values[1], 10);
                    const year = parseInt(values[3], 10);
                    entry['Category'] = values[0].trim();
                    entry['Quantity'] = isNaN(quantity) ? 0 : quantity;
                    entry['Period'] = values[2].trim();
                    entry['Year'] = isNaN(year) ? 0 : year;
                }
                return entry;
            });
        };

        arrestsData = parseCustomTSV(arrestsText);
        seizuresData = parseCustomTSV(seizuresText);
        const casesText = await fetch(CASES_PATH).then(res => res.text());
        const allCasesData = d3.csvParse(casesText, d => {
            const quantity = parseInt(d.Cantidad, 10);
            const year = parseInt(d['Ao'], 10); // Note: 'Ao' might be 'Año' in some systems, but using 'Ao' as per provided content
            return {
                crime: d.Delito,
                province: d.Provincia,
                quantity: isNaN(quantity) ? 0 : quantity,
                month: d.Mes,
                year: isNaN(year) ? 0 : year
            };
        });

        casesData = allCasesData.filter(d => {
            const crimeLower = d.crime.toLowerCase();
            return crimeLower.includes('drog') || crimeLower.includes('50-88');
        });

        console.log('Arrests Data:', arrestsData);
        console.log('Seizures Data:', seizuresData);
        console.log('Cases Data:', casesData);

        // Correct typo in 'Period' for arrestsData
        arrestsData.forEach(entry => {
            if (entry.Period === 'Octubre a Diembre') {
                entry.Period = 'Octubre a Diciembre';
            }
        });

        populateFilters();
        updateDashboard();
    }

    function populateFilters() {
        const yearFilter = document.getElementById('year-filter');
        const quarterFilter = document.getElementById('quarter-filter');

        // Add "All years" option
        const allYearsOption = document.createElement('option');
        allYearsOption.value = 'all';
        allYearsOption.textContent = 'Todos los años';
        yearFilter.appendChild(allYearsOption);

        // Populate year filter with unique years
        const years = [...new Set(arrestsData.map(d => d.Year))].sort();
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        });
        yearFilter.value = 'all'; // Set default to "All years"

        // Add "All quarters" option
        const allQuartersOption = document.createElement('option');
        allQuartersOption.value = 'all';
        allQuartersOption.textContent = 'Todos los trimestres'; // Spanish for "All quarters"
        quarterFilter.appendChild(allQuartersOption);

        // Populate quarter filter with unique quarters
        const quarters = [...new Set(arrestsData.map(d => d.Period))];
        quarters.forEach(quarter => {
            const option = document.createElement('option');
            option.value = quarter;
            option.textContent = quarter;
            quarterFilter.appendChild(option);
        });

        yearFilter.addEventListener('change', updateDashboard);
        quarterFilter.addEventListener('change', updateDashboard); // Added listener for quarter filter
    }

    function updateDashboard() {
        const selectedYear = document.getElementById('year-filter').value;
        const selectedQuarter = document.getElementById('quarter-filter').value;
        const isAllQuarters = selectedQuarter === 'all'; // Define isAllQuarters here

        // Reset pagination when filters change
        currentCasesChartPage = 1;
        currentCasesTablePage = 1;

        // Filter logic will be implemented here
        console.log(`Filtering by Year: ${selectedYear}, Quarter: ${selectedQuarter}`);

        // Update charts
        updateOverview();
        updateArrestsChart(isAllQuarters); // Pass isAllQuarters here
        updateSeizuresChart();
        updateCasesChart(isAllQuarters); // Pass isAllQuarters to updateCasesChart
        updateCasesTable(isAllQuarters); // Pass isAllQuarters to updateCasesTable
        updateSocialCost();
    }

    function updateOverview() {
        const selectedYear = document.getElementById('year-filter').value;
        const isAllYears = selectedYear === 'all';

        const yearArrests = isAllYears ? arrestsData : arrestsData.filter(d => d.Year == selectedYear);
        const yearSeizures = isAllYears ? seizuresData : seizuresData.filter(d => d.Year == selectedYear);
        const yearCases = isAllYears ? casesData : casesData.filter(d => d.year == selectedYear);

        const totalArrests = yearArrests.reduce((sum, d) => sum + d.Quantity, 0);
        const totalSeizures = yearSeizures.reduce((sum, d) => {
            if (d.Unit === 'Gramo') return sum + d.Quantity / 1000;
            if (d.Unit === 'Kilogramo') return sum + d.Quantity;
            return sum;
        }, 0);
        const totalCases = yearCases.reduce((sum, d) => sum + d.quantity, 0);

        document.getElementById('total-arrests').textContent = totalArrests.toLocaleString();
        document.getElementById('total-seizures').textContent = totalSeizures.toLocaleString(undefined, { maximumFractionDigits: 2 });
        document.getElementById('total-cases').textContent = totalCases.toLocaleString();

        const labels = isAllYears ? [...new Set(arrestsData.map(d => d.Year))].sort() : [...new Set(arrestsData.map(d => d.Period))].sort();

        const arrestsByPeriod = labels.map(p => yearArrests.filter(d => (isAllYears ? d.Year == p : d.Period === p)).reduce((sum, d) => sum + d.Quantity, 0));
        const seizuresByPeriod = labels.map(p => yearSeizures.filter(d => (isAllYears ? d.Year == p : d.Period === p)).reduce((sum, d) => {
            if (d.Unit === 'Gramo') return sum + d.Quantity / 1000;
            if (d.Unit === 'Kilogramo') return sum + d.Quantity;
            return sum;
        }, 0));
        const casesByPeriod = labels.map(p => yearCases.filter(d => (isAllYears ? d.year == p : getQuarter(d.month) === p)).reduce((sum, d) => sum + d.quantity, 0));


        const ctx = document.getElementById('overview-timeline').getContext('2d');
        if (overviewChart) {
            overviewChart.destroy();
        }
        overviewChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Arrestos',
                        data: arrestsByPeriod,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    },
                    {
                        label: 'Decomisos (kg)',
                        data: seizuresByPeriod,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    },
                    {
                        label: 'Casos Judiciales',
                        data: casesByPeriod,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function updateArrestsChart(isAllQuarters) { // Accept isAllQuarters as a parameter
        const selectedYear = document.getElementById('year-filter').value;
        const isAllYears = selectedYear === 'all';

        // Filter by year
        let filteredArrests = isAllYears ? arrestsData : arrestsData.filter(d => d.Year == selectedYear);

        // Filter by quarter only if isAllQuarters is false
        if (!isAllQuarters) {
            const selectedQuarter = document.getElementById('quarter-filter').value; // Fetch only when needed
            filteredArrests = filteredArrests.filter(d => d.Period == selectedQuarter);
        } else {
            console.log('Skipping quarter filter for arrests chart as isAllQuarters is true.');
        }

        const ageGroups = filteredArrests.filter(d => d.Category.startsWith('Edad'));
        const sexGroups = filteredArrests.filter(d => ['Hombres', 'Mujeres'].includes(d.Category));
        const nationalityGroups = filteredArrests.filter(d => ['Dominicanos', 'Extranjeros'].includes(d.Category));

        const ctx = document.getElementById('arrests-chart').getContext('2d');
        if (arrestsChart) {
            arrestsChart.destroy();
        }
        arrestsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Grupo de Edad', 'Sexo', 'Nacionalidad'],
                datasets: [
                    {
                        label: 'Edad 1 a 17',
                        data: [ageGroups.find(d => d.Category === 'Edad 1 a 17')?.Quantity || 0, 0, 0],
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    },
                    {
                        label: 'Edad 18 a 25',
                        data: [ageGroups.find(d => d.Category === 'Edad 18 a 25')?.Quantity || 0, 0, 0],
                        backgroundColor: 'rgba(255, 159, 64, 0.5)',
                    },
                    {
                        label: 'Hombres',
                        data: [0, sexGroups.find(d => d.Category === 'Hombres')?.Quantity || 0, 0],
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    },
                    {
                        label: 'Mujeres',
                        data: [0, sexGroups.find(d => d.Category === 'Mujeres')?.Quantity || 0, 0],
                        backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    },
                    {
                        label: 'Dominicanos',
                        data: [0, 0, nationalityGroups.find(d => d.Category === 'Dominicanos')?.Quantity || 0],
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    },
                    {
                        label: 'Extranjeros',
                        data: [0, 0, nationalityGroups.find(d => d.Category === 'Extranjeros')?.Quantity || 0],
                        backgroundColor: 'rgba(255, 206, 86, 0.5)',
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function updateSeizuresChart() {
        const selectedYear = document.getElementById('year-filter').value;
        const isAllYears = selectedYear === 'all';
        
        const yearSeizures = isAllYears ? seizuresData : seizuresData.filter(d => d.Year == selectedYear);
        const labels = isAllYears ? [...new Set(seizuresData.map(d => d.Year))].sort() : [...new Set(yearSeizures.map(d => d.Period))].sort();

        // Create filters only once to preserve user selection
        const seizureFilters = document.getElementById('seizure-filters');
        if (!seizureFilters.hasChildNodes()) {
            const allDrugTypes = [...new Set(seizuresData.map(d => d.Drug))];
            allDrugTypes.forEach(drug => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `drug-${drug}`;
                checkbox.value = drug;
                checkbox.checked = true;
                checkbox.addEventListener('change', updateSeizuresChart);

                const label = document.createElement('label');
                label.htmlFor = `drug-${drug}`;
                label.textContent = drug;

                seizureFilters.appendChild(checkbox);
                seizureFilters.appendChild(label);
            });
        }

        const selectedDrugs = Array.from(seizureFilters.querySelectorAll('input:checked')).map(cb => cb.value);
        const chartData = yearSeizures.filter(d => selectedDrugs.includes(d.Drug));

        const datasets = selectedDrugs.map(drug => {
            const dataByPeriod = labels.map(p => {
                return chartData
                    .filter(d => d.Drug === drug && (isAllYears ? d.Year : d.Period) === p)
                    .reduce((sum, d) => sum + d.Quantity, 0);
            });
            return {
                label: drug,
                data: dataByPeriod,
                borderColor: getRandomColor(),
                fill: false
            };
        });

        const ctx = document.getElementById('seizures-chart').getContext('2d');
        if (seizuresChart) {
            seizuresChart.destroy();
        }
        seizuresChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cantidad'
                        }
                    }
                }
            }
        });
    }

    function getRandomColor() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r}, ${g}, ${b}, 0.5)`; // Changed alpha to 0.5 for consistency with other charts
    }

    // --- MODIFIED FUNCTION: updateCasesChart ---
    function updateCasesChart(isAllQuarters) { // Accept isAllQuarters as a parameter
        const selectedYear = document.getElementById('year-filter').value;
        const isAllYears = selectedYear === 'all';
        
        const yearToFilter = isAllYears ? null : parseInt(selectedYear, 10);
        
        // const selectedQuarter = document.getElementById('quarter-filter').value; // No longer needed here
        // const isAllQuarters = selectedQuarter === 'all'; // No longer needed here

        // Filter cases based on selected year and quarter
        let relevantCases = isAllYears
            ? casesData
            : casesData.filter(d => d.year === yearToFilter && d.year !== 0);

        if (!isAllQuarters) { // Use the passed parameter
            relevantCases = relevantCases.filter(d => getQuarter(d.month) === document.getElementById('quarter-filter').value); // Use the actual selected quarter value
        }
        
        // Aggregate quantities by crime
        const crimeQuantities = {};
        relevantCases.forEach(d => {
            if (!crimeQuantities[d.crime]) {
                crimeQuantities[d.crime] = 0;
            }
            crimeQuantities[d.crime] += d.quantity;
        });

        // Convert to array and sort by quantity descending
        const sortedCrimeQuantities = Object.entries(crimeQuantities)
            .map(([crime, quantity]) => ({ crime, quantity }))
            .sort((a, b) => b.quantity - a.quantity);

        // Calculate pagination for chart
        const totalPagesChart = Math.ceil(sortedCrimeQuantities.length / ITEMS_PER_PAGE_CHART);
        const startIndexChart = (currentCasesChartPage - 1) * ITEMS_PER_PAGE_CHART;
        const endIndexChart = startIndexChart + ITEMS_PER_PAGE_CHART;
        const paginatedCrimes = sortedCrimeQuantities.slice(startIndexChart, endIndexChart);

        // Prepare data for chart
        const labels = paginatedCrimes.map(item => item.crime);
        const data = paginatedCrimes.map(item => item.quantity);

        // Generate a consistent set of colors for the current page's data
        const itemColors = paginatedCrimes.map(() => getRandomColor());

        // --- NEW LOGIC START ---
        const messageDiv = document.getElementById('cases-message'); // Use the correct message div
        const canvasChart = document.getElementById('cases-chart');
        const paginationChart = document.getElementById('cases-chart-pagination');

        if (relevantCases.length === 0) { // Simplified condition: if no cases, show message
            if (messageDiv) {
                messageDiv.textContent = "Estos datos solo existen por año, seleccionar todo el año para consultarlos";
                messageDiv.style.display = 'block';
            }
            if (canvasChart) canvasChart.style.display = 'none';
            if (paginationChart) paginationChart.style.display = 'none';
        } else {
            if (messageDiv) messageDiv.style.display = 'none'; // Hide message if data exists
            if (canvasChart) canvasChart.style.display = 'block';
            if (paginationChart) paginationChart.style.display = 'block';

            // --- ORIGINAL CHART RENDERING LOGIC START ---
            const ctx = document.getElementById('cases-chart').getContext('2d');
            if (casesChart) {
                casesChart.destroy();
            }
            casesChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: isAllYears ? 'Casos Judiciales (Todos los años)' : `Casos Judiciales (${selectedYear})`,
                        data: data,
                        backgroundColor: itemColors, // Use the generated array
                        borderColor: itemColors.map(color => color.replace('0.5', '1')), // Darker version for border from the same array
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Cantidad'
                            }
                        },
                        y: {
                            // No stacking needed if we show only one dataset (the current page)
                        }
                    },
                    plugins: {
                        legend: {
                            display: true // Show legend for the dataset label
                        }
                    }
                }
            });

            // --- Pagination Controls for Chart ---
            const paginationContainerChart = document.getElementById('cases-chart-pagination');
            if (!paginationContainerChart) {
                console.warn("Pagination container for cases chart not found. Please add an element with id 'cases-chart-pagination'.");
                return; // Exit if container not found
            }
            paginationContainerChart.innerHTML = ''; // Clear previous pagination controls

            // Previous button
            const prevButtonChart = document.createElement('button');
            prevButtonChart.textContent = 'Anterior';
            prevButtonChart.disabled = currentCasesChartPage === 1;
            prevButtonChart.addEventListener('click', () => {
                currentCasesChartPage--;
                updateCasesChart(isAllQuarters); // Pass isAllQuarters
            });
            paginationContainerChart.appendChild(prevButtonChart);

            // Page numbers
            for (let i = 1; i <= totalPagesChart; i++) {
                const pageButton = document.createElement('button');
                pageButton.textContent = i;
                pageButton.disabled = i === currentCasesChartPage;
                pageButton.addEventListener('click', () => {
                    currentCasesChartPage = i;
                    updateCasesChart(isAllQuarters); // Pass isAllQuarters
                });
                paginationContainerChart.appendChild(pageButton);
            }

            // Next button
            const nextButtonChart = document.createElement('button');
            nextButtonChart.textContent = 'Siguiente';
            nextButtonChart.disabled = currentCasesChartPage === totalPagesChart;
            nextButtonChart.addEventListener('click', () => {
                currentCasesChartPage++;
                updateCasesChart(isAllQuarters); // Pass isAllQuarters
            });
            paginationContainerChart.appendChild(nextButtonChart);

            // Display current page info
            const pageInfoChart = document.createElement('span');
            pageInfoChart.textContent = ` Página ${currentCasesChartPage} de ${totalPagesChart}`;
            paginationContainerChart.appendChild(pageInfoChart);
            // --- ORIGINAL CHART RENDERING LOGIC END ---
        }
    }

    // --- MODIFIED FUNCTION: updateCasesTable ---
    function updateCasesTable(isAllQuarters) { // Accept isAllQuarters as a parameter
        const selectedYear = document.getElementById('year-filter').value;
        const isAllYears = selectedYear === 'all';
        const tableBody = document.getElementById('cases-table').querySelector('tbody');
        // tableBody.innerHTML = ''; // This will be handled by showing/hiding the message div

        const yearToFilter = isAllYears ? null : parseInt(selectedYear, 10);
        
        // Filter out entries with year 0 if a specific year is selected 
        let filteredCases = isAllYears
            ? casesData
            : casesData.filter(d => d.year === yearToFilter && d.year !== 0);

        console.log('casesData: ', casesData);

        // Only filter by quarter if isAllQuarters is false
        if (!isAllQuarters) {
            const selectedQuarter = document.getElementById('quarter-filter').value; // Fetch only when needed
            filteredCases = filteredCases.filter(d => getQuarter(d.month) === selectedQuarter);
            console.log('filteredCases (filtered by quarter): ', filteredCases);
        } else {
            console.log('Skipping quarter filter as isAllQuarters is true.');
        }

        // --- NEW LOGIC START ---
        const casesMessageDiv = document.getElementById('cases-message'); // Use the correct message div
        const tablePagination = document.getElementById('cases-table-pagination');

        // Clear previous content and hide message initially
        tableBody.innerHTML = '';
        if (casesMessageDiv) casesMessageDiv.style.display = 'none';

        if (filteredCases.length === 0) {
            // Display message if no data is found for the selected filters
            if (casesMessageDiv) {
                casesMessageDiv.textContent = "Estos datos solo existen por año, seleccionar todo el año para consultarlos";
                casesMessageDiv.style.display = 'block';
            }
            // Hide pagination if no data
            if (tablePagination) tablePagination.style.display = 'none';
        } else {
            // Populate table with data if available
            // Sort cases by quantity in descending order
            filteredCases.sort((a, b) => b.quantity - a.quantity);

            // Calculate pagination
            const totalPagesTable = Math.ceil(filteredCases.length / ITEMS_PER_PAGE_TABLE);
            const startIndexTable = (currentCasesTablePage - 1) * ITEMS_PER_PAGE_TABLE;
            const endIndexTable = startIndexTable + ITEMS_PER_PAGE_TABLE;
            const paginatedCases = filteredCases.slice(startIndexTable, endIndexTable);

            // Populate table with paginated data
            paginatedCases.forEach(d => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${d.crime}</td>
                    <td>${d.province}</td>
                    <td>${d.quantity}</td>
                    <td>${d.month}</td>
                    <td>${d.year}</td>
                `;
                tableBody.appendChild(row);
            });

            console.log('_filteredCases: ', filteredCases);
            
            // --- Pagination Controls for Table ---
            const paginationContainer = document.getElementById('cases-table-pagination');
            if (!paginationContainer) {
                console.warn("Pagination container for cases table not found. Please add an element with id 'cases-table-pagination'.");
                return; // Exit if container not found
            }
            paginationContainer.innerHTML = ''; // Clear previous pagination controls

            // Previous button
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Anterior';
            prevButton.disabled = currentCasesTablePage === 1;
            prevButton.addEventListener('click', () => {
                currentCasesTablePage = 1; // Corrected: reset table page, not chart page
                currentCasesTablePage--;
                updateCasesTable(isAllQuarters); // Pass isAllQuarters to updateCasesTable
                updateCasesChart(isAllQuarters); // Re-render chart to ensure consistency if needed, passing isAllQuarters
            });
            paginationContainer.appendChild(prevButton);

            // Page numbers
            for (let i = 1; i <= totalPagesTable; i++) {
                const pageButton = document.createElement('button');
                pageButton.textContent = i;
                pageButton.disabled = i === currentCasesTablePage;
                pageButton.addEventListener('click', () => {
                currentCasesTablePage = 1; // Reset chart page when table pagination changes
                currentCasesTablePage = i;
                updateCasesTable(isAllQuarters); // Pass isAllQuarters
                    updateCasesChart(isAllQuarters); // Pass isAllQuarters
                });
                paginationContainer.appendChild(pageButton);
            }

            // Next button
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Siguiente';
            nextButton.disabled = currentCasesTablePage === totalPagesTable;
            nextButton.addEventListener('click', () => {
                currentCasesTablePage = 1; // Corrected: reset table page, not chart page
                currentCasesTablePage++;
                updateCasesTable(isAllQuarters); // Pass isAllQuarters
                updateCasesChart(isAllQuarters); // Pass isAllQuarters
            });
            paginationContainer.appendChild(nextButton);

            // Display current page info
            const pageInfo = document.createElement('span');
            pageInfo.textContent = ` Página ${currentCasesTablePage} de ${totalPagesTable}`;
            paginationContainer.appendChild(pageInfo);
            // --- ORIGINAL TABLE RENDERING LOGIC END ---
        }
    }

    function updateSocialCost() {
        // Logic to update Sankey diagram
        const sankeyContainer = document.getElementById('sankey-diagram');
        sankeyContainer.innerHTML = '<p>El diagrama de Sankey se implementará en una futura actualización.</p>';
    }

    function exportToPNG() {
        const canvas = document.querySelector('canvas');
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'chart.png';
        link.click();
    }

    function exportToCSV() {
        const headers = ['Category', 'Quantity', 'Period', 'Year'];
        const rows = arrestsData.map(d => [d.Category, d.Quantity, d.Period, d.Year]);
        let csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "arrests_data.csv");
        document.body.appendChild(link);
        link.click();
    }

    document.getElementById('export-png').addEventListener('click', exportToPNG);
    document.getElementById('export-csv').addEventListener('click', exportToCSV);

    loadData();
});
