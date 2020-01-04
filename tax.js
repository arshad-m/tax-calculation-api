function Tax(params){
    let temp_params = JSON.parse(params);
    Object.keys(temp_params).map(function(key, index) {
        if(key != '_token') {
            let floatvalue = parseFloat(temp_params[key]);
            temp_params[key] = isNaN(floatvalue) ? 0 : floatvalue;
        }
    });

    this.params = temp_params;
    // gross total income 
    this.gti = {'iuhs':0, 'inf':0, 'tri':0, 'infos':0, 'sum':0}
    // total deduction
    this.td = {'80c':0, '80ccd':0, 'rgess':0, 'under4a':0, 'sum':0}
}

// ihs: income under head salaries
Tax.prototype.incomeUnderHeadSalaries = function(){
    // substraction from 4 input  ihs_salary, ihs_deduction, ihs_pt, ihs_hra
    let {ihs_salary, ihs_deduction, ihs_pt, ihs_hra} = this.params;
    let total = (ihs_salary - ihs_hra - ihs_deduction - ihs_pt)
    return total;
}

Tax.prototype.incomeFromProfession = function() {
    return this.params.income_from_profession;
}

Tax.prototype.totalRentIncome = function(){
    let income_from_rent = this.params.income_from_rent
    let std_deduction = (30/100)* income_from_rent; 
    let exemption = 200000; //exemption on home loan interest
    return (income_from_rent - std_deduction - exemption);
}

// ios: income from other source
Tax.prototype.incomeFromOtherSource = function(){
    // sum from 4 input ios_bank, ios_nsc, ios_po_mis, ios_po_rd
    let {ios_bank, ios_nsc, ios_po_mis, ios_po_rd} = this.params
    let total = (ios_bank + ios_nsc + ios_po_mis + ios_po_rd)
    return total;
}

Tax.prototype.grossTotalIncome = function(){
    this.gti.iuhs =  this.incomeUnderHeadSalaries();
    this.gti.inf =  this.incomeFromProfession();
    this.gti.tri =  this.totalRentIncome();
    this.gti.infos =  this.incomeFromOtherSource();

    // return (income_under_head_salaries + income_from_profession + income_from_rent + income_from_other_source);
    this.gti.sum = Object.values(this.gti).reduce((acc, v) => acc+v);
    return this.gti.sum;
}

// d80: deduction under chapter 80C
Tax.prototype.deduction80C = function(){
    // sum for 15 param & find min (sum, 150000)
    let {d80_epf, d80_ppf, d80_scss, d80_nsc, d80_ts_fd, d80_ts_bond, d80_mf, d80_lip, d80_nps, d80_pp, d80_80ccd, d80_hl, d80_sukanya, d80_charges, d80_tution_fee} = this.params;
    let sum = (d80_epf+d80_ppf+d80_scss+d80_nsc+d80_ts_fd+d80_ts_bond+d80_mf+d80_lip+d80_nps+d80_pp+d80_80ccd+d80_hl+d80_sukanya+d80_charges+d80_tution_fee);
    return {total: sum, min_value : Math.min(sum, 150000)};
}

Tax.prototype.deduction80CCD = function(){
    // return min of param,50000
    return Math.min(this.params.deduction_80ccd, 50000);
}

Tax.prototype.deductionRGESS = function(){
    // return min of param,50000
    return Math.min(this.params.deduction_rgess, 50000);
}

// d4a: deduction under chapter 4a
Tax.prototype.deductionUnder4A = function(){
    // sum for 9 param & find min (sum, 150000)
    let {d4a_mi_self, d4a_mi_parent, d4a_int_edu, d4a_med_treatment, d4a_exp_med_treatment, d4a_donation, d4a_rent, d4a_pda, d4a_int_earn_fd} = this.params
    return (d4a_mi_self + d4a_mi_parent + d4a_int_edu + d4a_med_treatment + d4a_exp_med_treatment + d4a_donation + d4a_rent + d4a_pda + d4a_int_earn_fd);
}

Tax.prototype.totalDeduction = function(){
    this.td['80ccd'] = this.deduction80CCD();
    this.td['rgess'] = this.deductionRGESS();
    this.td['under4a'] = this.deductionUnder4A();

    // return (deduction_80c.min_value + deduction_80ccd + deduction_rgess + deduction_under4a)
    this.td.sum =  Object.values(this.td).reduce((acc, v) => acc+v);

    this.td['80c'] = this.deduction80C();
    this.td.sum += this.td['80c']['min_value'];

    return this.td.sum;
}


Tax.prototype.getTaxableValue = function(){
    let gross_total_income = this.grossTotalIncome();
    let total_deduction = this.totalDeduction();
    let taxable_income =  gross_total_income - total_deduction;
    let tax_rebate = (taxable_income <= 500000 ? 12500: 0)
    let net_taxable_income = taxable_income - tax_rebate;
    let total_tax_payable = 0;
    let tax_surcharge = 0;

    switch (true) {
        case (net_taxable_income < 250000):
            total_tax_payable = 0;
            break;

        case (net_taxable_income < 500000):
            total_tax_payable = 0.05*(net_taxable_income-250000);
            break;

        case (net_taxable_income < 1000000):
            total_tax_payable = 12500+0.2*(net_taxable_income-500000);
            break;

        default:
            // for more than 10L
            total_tax_payable = 112500+0.3*(net_taxable_income-1000000)
            break;
    }

    switch (true) {
        case (net_taxable_income >=50000000):
            tax_surcharge = total_tax_payable*(37/100);
            break;

        case (net_taxable_income >=20000000):
            tax_surcharge = total_tax_payable*(25/100);
            break;

        case (net_taxable_income >=10000000):
            tax_surcharge = total_tax_payable*(15/100);
            break;

        case (net_taxable_income >=5000000):
            tax_surcharge = total_tax_payable*(10/100);
            break;

        default:
            tax_surcharge = 0
            break;
    }

    let edu_health_cess = (total_tax_payable+tax_surcharge)*(4/100);
    let net_tax_payable = (total_tax_payable + edu_health_cess);
    let tax_remaining_to_paid = (net_tax_payable - this.params.adv_tax_paid_tds)

    return {
        gross_total_income:this.gti,
        total_deduction:this.td,
        taxable_income:taxable_income,
        tax_rebate:tax_rebate,
        net_taxable_income:net_taxable_income,
        total_tax_payable:total_tax_payable,
        tax_surcharge:tax_surcharge,
        edu_health_cess:edu_health_cess,
        net_tax_payable:net_tax_payable,
        tax_remaining_to_paid:tax_remaining_to_paid
    }

}

module.exports = Tax