/* eslint-disable no-undef */
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import kmeans from 'node-kmeans';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/api/customers', async (req, res) => {

    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('ID', { ascending: false })
        .select('*', { count: 'exact', head: true });

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);
});

app.post('/api/customers', async (req, res) => {
    const { income, recency, mnt_wines, mnt_meat } = req.body;
    const newId = Math.floor(Math.random() * 90000) + 10000; 
    const { error } = await supabase.from('customers').insert([{ ID: newId, Income: income, Recency: recency, MntWines: mnt_wines, MntMeatProducts: mnt_meat }]);
    if (error) return res.status(500).json(error);
    res.json({ message: 'Data berhasil ditambahkan' });
});

app.put('/api/customers/:id', async (req, res) => {
    const { income, recency, mnt_wines, mnt_meat } = req.body;
    const { error } = await supabase.from('customers').update({ Income: income, Recency: recency, MntWines: mnt_wines, MntMeatProducts: mnt_meat }).eq('ID', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ message: 'Data diupdate!' });
});

app.delete('/api/customers/:id', async (req, res) => {
    const { error } = await supabase.from('customers').delete().eq('ID', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ message: 'Data dihapus!' });
});

app.post('/api/run-kmeans', async (req, res) => {

    const { data, error } = await supabase
        .from('customers')
        .select('*');


    if(error)
        return res.status(500).json(error);


    if(!data || data.length < 3)
        return res.status(400).json({
            message:"Minimal 3 data"
        });



    const vectors = data.map(item => [

        Number(item.Income) || 0,
        Number(item.Recency) || 0,
        Number(item.MntWines) || 0,
        Number(item.MntMeatProducts) || 0

    ]);



    kmeans.clusterize(
        vectors,
        { k:3 },

        async(err,result)=>{

        if(err)
            return res.status(500).json(err);



        let updates = [];



        result.forEach((cluster)=>{


            cluster.clusterInd.forEach(index=>{


                updates.push({

                    ID:data[index].ID,

                    Income:data[index].Income,

                    Recency:data[index].Recency,

                    MntWines:data[index].MntWines,

                    MntMeatProducts:data[index].MntMeatProducts,

                    cluster:result.indexOf(cluster)

                });


            });


        });



let updateError = null;


for (const item of updates) {

    const { error } = await supabase
        .from('customers')
        .update({
            cluster: item.cluster
        })
        .eq('ID', item.ID);


    if(error){
        updateError = error;
        break;
    }

}


if(updateError){
    return res.status(500).json(updateError);
}
        res.json({
            message:"KMeans selesai",
            total:updates.length
        });


    });


});
app.post('/api/reset-cluster', async(req,res)=>{

    const {error}=await supabase
    .from('customers')
    .update({
        cluster:null
    })
    .not('ID','is',null);


    if(error)
        return res.status(500).json(error);


    res.json({
        message:"reset"
    });

});

// WAJIB ADA INI AGAR VERCEL BISA MENJALANKANNYA
export default app;