const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const bd = require('body-parser');

const file = path.join(__dirname, 'order-json-address-json', 'order.json');
const file2 = path.join(__dirname, 'order-json-address-json', 'address.json');

app.use(bd.json());

app.get('/sales', (req, res) => {
    fs.readFile(file, 'utf-8', (err, data) => {
        if(err){
            return res.status(500).json({error: "File not Found"});
        }
        res.header("Content-Type", "application/json");
        res.send(data);
    })
})

app.get('/address', (req, res) => {
    
    fs.readFile(file2, 'utf-8', (err, data) => {
        if(err){
            return res.status(500).json({error: "File not Found"});
        }
        res.header("Content-Type", "application/json");
        res.send(data);
    })
})


app.get('/sales/highest-business-date', (req, res) => {
        fs.readFile(file, 'utf-8', (err, dat) => {
            if(err){
                return res.status(500).json({error: "File Not Found"});
            }
            const data = JSON.parse(dat);
            const result = data.map(item => ({
                ...item,
                OrderAmount: parseInt(item.OrderAmount),
            }));

            const high = result.reduce((val ,item) => {
                    return item.OrderAmount > val ? item.OrderAmount : val;
            },0);

            const u = (result.find(x => x.OrderAmount === high)).OrderDate
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({
                Date: u
            }));
        })
})



app.get('/sales/lowest-wholesale-market', (req, res) => {
    fs.readFile(file, 'utf-8', (err, dat) => {
        if(err){
            return res.status(500).json({error: "File Not Found"});
        }
        const data = JSON.parse(dat);
        const result = data.map(item => ({
            ...item,
            OrderAmount: parseInt(item.OrderAmount),
        }));

        const fil = result.filter(z => z.TypeOfOrder == "Wholesale");

        const low = fil.reduce((val ,item) => {
                return item.OrderAmount < val ? item.OrderAmount : val;
        },Number.MAX_SAFE_INTEGER);

        const u = (result.find(x => x.OrderAmount === low)).CustomerID;


        fs.readFile(file2, 'utf-8', (err, da) => {
            if(err){
                return err;
            }
            const data2 = JSON.parse(da);
            const v = (data2.find(x => x.CustomerID == u)).City;
            res.header("Content-Type", "application/json");
            
            res.send(JSON.stringify({
                city: v
            }));
        })
        
    })
})


app.get('/customers', (req, res) => {

    fs.readFile(file2, 'utf8', (err, cdata) => {
        if (err) {
            return res.status(500).json({error: "File Not Found"});
        }

        fs.readFile(file, 'utf8', (err, odata) => {
            if (err) {
                return res.status(500).json({error: "File Not Found"});
            }

            const custdata = JSON.parse(cdata);
            const orders = JSON.parse(odata);

            const output = [];
            const map = new Map();

            custdata.forEach(c => {
                const uniqueKey = `${c.FirstName} ${c.LastName} ${c.Address}`;

                if (!map.has(uniqueKey)) {
                    map.set(uniqueKey, c);
                    c.total = 0;
                    output.push(c);
                }
            });

            const result = orders.map(item => ({
                ...item,
                OrderAmount: parseInt(item.OrderAmount),
            }));

            const totalAmount = {};

            result.forEach(o => {
                if (totalAmount[o.CustomerID]) {
                    totalAmount[o.CustomerID] += o.OrderAmount;
                } else {
                    totalAmount[o.CustomerID] = o.OrderAmount;
                }
            });

            output.forEach(c => {
                if (totalAmount[c.CustomerID]) {
                    c.total = totalAmount[c.CustomerID];
                }

            });

            const op = output.map(o => ({
                Name: `${o.FirstName} ${o.LastName}`,
                Address: `${o.Address}`,
                TotalOrderValue: `${o.total}`
            }));

            res.send(op);


        });
    });

})


app.get('/sales/percentage-change-wholesale', (req, res) => {

    const moment = require('moment');
    
    fs.readFile(file, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({error: "File Not Found"});
        }
    
        const orders = JSON.parse(data);
    
        const wholesale = orders.filter(order => order.TypeOfOrder === 'Wholesale');
    
        const wt = wholesale.reduce((acc, o) => {
            const wstart = moment(o.OrderDate, 'DD-MM-YYYY').startOf('week').format('YYYY-WW');
            const amount = parseInt(o.OrderAmount);
            
            if (!acc[wstart]) {
                acc[wstart] = 0;
            }
            acc[wstart] += amount;
    
            return acc;
        }, {});
    
        const wsort = Object.entries(wt)
            .map(([week, total]) => ({ week, total }))
            .sort((a, b) => moment(a.week, 'YYYY-WW').diff(moment(b.week, 'YYYY-WW')));
    
        const label = wsort.map((entry, index) => `week${index + 1}`);
        
        const output = wsort.reduce((acc, entry, index, array) => {
            if (index === 0) {
                return acc;
            }
    
            const prev = array[index - 1].total;
            const curr = entry.total;
            const percentage = ((curr - prev) / prev) * 100;
            const num = `${Math.round(percentage)}%`;
    
            const prevWeekLabel = label[index - 1];
            const currentWeekLabel = label[index];
            const key = `${prevWeekLabel}_to_${currentWeekLabel}`;
    
            acc[key] = percentage >= 0 ? `+${num}` : num;
    
            return acc;
        }, {});
    
        res.send(output);
    });
    
})


app.get('/sales/weekwise', (req, res) => {
    fs.readFile(file, 'utf8', (err, data) => {
        if(err){
            return res.status(500).json({error: "File Not Found"});
        }
        const orderData = JSON.parse(data);
        const salesByCustomerType = {};

        const parseDate = (dateStr) => new Date(dateStr);
        const getWeekNumber = (date) => {
            const start = new Date(date.getFullYear(), 0, 1);
            const diff = date - start + ((start.getDay() + 1) * 86400000);
            const oneWeek = 604800000;
            return Math.ceil(diff / oneWeek);
        };
        
        orderData.forEach(order => {
            const date = parseDate(order.OrderDate);
            const week = `week${getWeekNumber(date)}`;
            const customerType = order.TypeOfOrder;
        
            if (!salesByCustomerType[week]) {
                salesByCustomerType[week] = {};
            }
        
            if (!salesByCustomerType[week][customerType]) {
                salesByCustomerType[week][customerType] = 0;
            }
        
            salesByCustomerType[week][customerType] += parseFloat(order.OrderAmount);
        });
        
        const sortedSalesOutput = {};
        Object.keys(salesByCustomerType)
            .sort((a, b) => parseInt(a.replace('week', '')) - parseInt(b.replace('week', '')))
            .forEach(week => {
                sortedSalesOutput[week] = salesByCustomerType[week];
            });
        
        Object.keys(sortedSalesOutput).forEach(week => {
            Object.keys(sortedSalesOutput[week]).forEach(type => {
                sortedSalesOutput[week][type] = `$${sortedSalesOutput[week][type].toFixed(2)}`;
            });
        });
        
        res.send(sortedSalesOutput);
    })
});


app.listen(3000, () => {
    console.log("Server Running in port 3000");
    console.log(`http://localhost:3000/sales`);
});
