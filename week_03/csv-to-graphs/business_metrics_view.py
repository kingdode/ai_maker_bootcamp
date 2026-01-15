import pandas as pd
import matplotlib.pyplot as plt
import warnings

# Load the dataset
df = pd.read_csv('sample_hr_dataset.csv')

# Set up the figure with subplots
fig, axes = plt.subplots(3, 3, figsize=(20, 15))
fig.suptitle('HR Business Metrics Dashboard', fontsize=20, fontweight='bold', y=0.995)

# 1. Department Distribution
if 'Department' in df.columns:
    ax1 = axes[0, 0]
    dept_counts = df['Department'].value_counts()
    colors1 = plt.cm.Set3(range(len(dept_counts)))
    ax1.pie(dept_counts.values, labels=dept_counts.index, autopct='%1.1f%%', 
            startangle=90, colors=colors1)
    ax1.set_title('Employee Distribution by Department', fontsize=12, fontweight='bold', pad=10)
else:
    axes[0, 0].text(0.5, 0.5, 'Department data not available', 
                    ha='center', va='center', transform=axes[0, 0].transAxes)
    axes[0, 0].set_title('Employee Distribution by Department', fontsize=12, fontweight='bold')

# 2. Employment Status
if 'EmploymentStatus' in df.columns:
    ax2 = axes[0, 1]
    emp_status = df['EmploymentStatus'].value_counts()
    colors2 = ['#66b3ff', '#ff9999', '#99ff99']
    ax2.pie(emp_status.values, labels=emp_status.index, autopct='%1.1f%%', 
            startangle=90, colors=colors2[:len(emp_status)])
    ax2.set_title('Employment Status Distribution', fontsize=12, fontweight='bold', pad=10)
else:
    axes[0, 1].text(0.5, 0.5, 'Employment Status data not available', 
                    ha='center', va='center', transform=axes[0, 1].transAxes)
    axes[0, 1].set_title('Employment Status Distribution', fontsize=12, fontweight='bold')

# 3. Performance Score Distribution
if 'PerformanceScore' in df.columns:
    ax3 = axes[0, 2]
    perf_scores = df['PerformanceScore'].value_counts()
    colors3 = ['#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181']
    ax3.pie(perf_scores.values, labels=perf_scores.index, autopct='%1.1f%%', 
            startangle=90, colors=colors3[:len(perf_scores)])
    ax3.set_title('Performance Score Distribution', fontsize=12, fontweight='bold', pad=10)
else:
    axes[0, 2].text(0.5, 0.5, 'Performance Score data not available', 
                    ha='center', va='center', transform=axes[0, 2].transAxes)
    axes[0, 2].set_title('Performance Score Distribution', fontsize=12, fontweight='bold')

# 4. Recruitment Source Distribution
if 'RecruitmentSource' in df.columns:
    ax4 = axes[1, 0]
    recruit_source = df['RecruitmentSource'].value_counts()
    colors4 = plt.cm.Pastel1(range(len(recruit_source)))
    ax4.pie(recruit_source.values, labels=recruit_source.index, autopct='%1.1f%%', 
            startangle=90, colors=colors4)
    ax4.set_title('Recruitment Source Distribution', fontsize=12, fontweight='bold', pad=10)
else:
    axes[1, 0].text(0.5, 0.5, 'Recruitment Source data not available', 
                    ha='center', va='center', transform=axes[1, 0].transAxes)
    axes[1, 0].set_title('Recruitment Source Distribution', fontsize=12, fontweight='bold')

# 5. Marital Status Distribution
if 'MaritalDesc' in df.columns:
    ax5 = axes[1, 1]
    marital_status = df['MaritalDesc'].value_counts()
    colors5 = plt.cm.Accent(range(len(marital_status)))
    ax5.pie(marital_status.values, labels=marital_status.index, autopct='%1.1f%%', 
            startangle=90, colors=colors5)
    ax5.set_title('Marital Status Distribution', fontsize=12, fontweight='bold', pad=10)
else:
    axes[1, 1].text(0.5, 0.5, 'Marital Status data not available', 
                    ha='center', va='center', transform=axes[1, 1].transAxes)
    axes[1, 1].set_title('Marital Status Distribution', fontsize=12, fontweight='bold')

# 6. Gender Distribution
if 'Sex' in df.columns:
    ax6 = axes[1, 2]
    gender_counts = df['Sex'].value_counts()
    colors6 = ['#ffb3ba', '#bae1ff']
    ax6.pie(gender_counts.values, labels=gender_counts.index, autopct='%1.1f%%', 
            startangle=90, colors=colors6[:len(gender_counts)])
    ax6.set_title('Gender Distribution', fontsize=12, fontweight='bold', pad=10)
else:
    axes[1, 2].text(0.5, 0.5, 'Gender data not available', 
                    ha='center', va='center', transform=axes[1, 2].transAxes)
    axes[1, 2].set_title('Gender Distribution', fontsize=12, fontweight='bold')

# 7. Termination Reasons (for terminated employees only)
if 'TermReason' in df.columns:
    ax7 = axes[2, 0]
    term_reasons = df[df['TermReason'] != 'N/A-StillEmployed']['TermReason'].value_counts()
    if len(term_reasons) > 0:
        colors7 = plt.cm.Reds(range(len(term_reasons)))
        ax7.pie(term_reasons.values, labels=term_reasons.index, autopct='%1.1f%%', 
                startangle=90, colors=colors7)
        ax7.set_title('Termination Reasons', fontsize=12, fontweight='bold', pad=10)
    else:
        axes[2, 0].text(0.5, 0.5, 'No termination data available', 
                        ha='center', va='center', transform=axes[2, 0].transAxes)
        axes[2, 0].set_title('Termination Reasons', fontsize=12, fontweight='bold')
else:
    axes[2, 0].text(0.5, 0.5, 'Termination Reason data not available', 
                    ha='center', va='center', transform=axes[2, 0].transAxes)
    axes[2, 0].set_title('Termination Reasons', fontsize=12, fontweight='bold')

# 8. Race/Ethnicity Distribution
if 'RaceDesc' in df.columns:
    ax8 = axes[2, 1]
    race_counts = df['RaceDesc'].value_counts()
    colors8 = plt.cm.Set2(range(len(race_counts)))
    ax8.pie(race_counts.values, labels=race_counts.index, autopct='%1.1f%%', 
            startangle=90, colors=colors8)
    ax8.set_title('Race/Ethnicity Distribution', fontsize=12, fontweight='bold', pad=10)
else:
    axes[2, 1].text(0.5, 0.5, 'Race/Ethnicity data not available', 
                    ha='center', va='center', transform=axes[2, 1].transAxes)
    axes[2, 1].set_title('Race/Ethnicity Distribution', fontsize=12, fontweight='bold')

# 9. Active vs Terminated (derived from Termd column)
if 'Termd' in df.columns:
    ax9 = axes[2, 2]
    term_status = df['Termd'].map({0: 'Active', 1: 'Terminated'}).value_counts()
    colors9 = ['#90EE90', '#FF6B6B']
    ax9.pie(term_status.values, labels=term_status.index, autopct='%1.1f%%', 
            startangle=90, colors=colors9)
    ax9.set_title('Active vs Terminated Employees', fontsize=12, fontweight='bold', pad=10)
else:
    axes[2, 2].text(0.5, 0.5, 'Termination status data not available', 
                    ha='center', va='center', transform=axes[2, 2].transAxes)
    axes[2, 2].set_title('Active vs Terminated Employees', fontsize=12, fontweight='bold')

plt.tight_layout(rect=[0, 0, 1, 0.99])
plt.savefig('business_metrics_dashboard.png', dpi=300, bbox_inches='tight')
plt.close()
print("Dashboard saved as 'business_metrics_dashboard.png'")

