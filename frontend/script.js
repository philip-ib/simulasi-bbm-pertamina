const { createApp } = Vue;

// Trik Sakti: Otomatis deteksi localhost vs internet Vercel
const API_URL = window.location.origin + "/api";

createApp({
  data() {
    return {
      currentTab: "simulasi",
      tokenAdmin: localStorage.getItem("token_admin") || null,
      loginUsername: "",
      loginPassword: "",
      listMotor: [],
      listBbm: [],
      selectedMotor: null,
      selectedBbm: null,
      tipeInput: "uang",
      inputUser: "",
      hasil: {},
      newMotorNama: "",
      newMotorKapasitas: "",
      newBbmNama: "",
      newBbmHarga: "",
      bbmToUpdate: null,
      updateBbmNama: "",
      updateBbmHarga: "",
      motorToUpdate: null,
      updateMotorNama: "",
      updateMotorKapasitas: "",
    };
  },
  mounted() {
    this.loadDataAwal();
  },
  methods: {
    async loadDataAwal() {
      try {
        const res = await fetch(`${API_URL}/data-awal`);
        const data = await res.json();
        this.listBbm = data.bensin || [];
        this.listMotor = data.motor || [];
        if (this.listMotor.length) this.selectedMotor = this.listMotor[0];
        if (this.listBbm.length) this.selectedBbm = this.listBbm[0];
      } catch (e) {
        console.error("Gagal memuat data awal:", e);
      }
    },
    async hitungSimulasi() {
      if (!this.inputUser) return (this.hasil = {});
      const res = await fetch(`${API_URL}/hitung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputUser: this.inputUser,
          tipeInput: this.tipeInput,
          kapasitasTangki: this.selectedMotor.kapasitas,
          hargaBbm: this.selectedBbm.harga,
        }),
      });
      this.hasil = await res.json();
    },
    async prosesLogin() {
      try {
        const res = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: this.loginUsername,
            password: this.loginPassword,
          }),
        });
        const data = await res.json();
        if (res.status !== 200) return alert(data.error);

        this.tokenAdmin = data.token;
        localStorage.setItem("token_admin", data.token);
        this.loginUsername = "";
        this.loginPassword = "";
      } catch (e) {
        alert("Gagal terhubung ke server backend!");
      }
    },
    logout() {
      this.tokenAdmin = null;
      localStorage.removeItem("token_admin");
    },
    isiFormUpdate() {
      if (this.bbmToUpdate) {
        this.updateBbmNama = this.bbmToUpdate.nama_bbm;
        this.updateBbmHarga = this.bbmToUpdate.harga;
      }
    },
    isiFormUpdateMotor() {
      if (this.motorToUpdate) {
        this.updateMotorNama = this.motorToUpdate.merek;
        this.updateMotorKapasitas = this.motorToUpdate.kapasitas;
      }
    },
    async tambahMotor() {
      const res = await fetch(`${API_URL}/motor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.tokenAdmin,
        },
        body: JSON.stringify({
          merek: this.newMotorNama,
          kapasitas: parseFloat(this.newMotorKapasitas),
        }),
      });
      const data = await res.json();
      if (res.status !== 200) return alert(data.error);
      alert("Sukses menambah motor!");
      this.newMotorNama = "";
      this.newMotorKapasitas = "";
      this.loadDataAwal();
    },
    async tambahBbm() {
      const res = await fetch(`${API_URL}/bensin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.tokenAdmin,
        },
        body: JSON.stringify({
          nama_bbm: this.newBbmNama,
          harga: parseInt(this.newBbmHarga),
        }),
      });
      const data = await res.json();
      if (res.status !== 200) return alert(data.error);
      alert("Sukses menambah BBM baru!");
      this.newBbmNama = "";
      this.newBbmHarga = "";
      this.loadDataAwal();
    },
    async updateDataBbm() {
      const res = await fetch(`${API_URL}/bensin/${this.bbmToUpdate.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.tokenAdmin,
        },
        body: JSON.stringify({
          nama_bbm: this.updateBbmNama,
          harga: parseInt(this.updateBbmHarga),
        }),
      });
      const data = await res.json();
      if (res.status !== 200) return alert(data.error);
      alert("Sukses mengubah data BBM!");
      this.bbmToUpdate = null;
      this.loadDataAwal();
    },
    async updateDataMotor() {
      const res = await fetch(`${API_URL}/motor/${this.motorToUpdate.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.tokenAdmin,
        },
        body: JSON.stringify({
          merek: this.updateMotorNama,
          kapasitas: parseFloat(this.updateMotorKapasitas),
        }),
      });
      const data = await res.json();
      if (res.status !== 200) return alert(data.error);
      alert("Sukses memperbarui data motor!");
      this.motorToUpdate = null;
      this.loadDataAwal();
    },
  },
  watch: {
    selectedMotor() {
      this.hitungSimulasi();
    },
    selectedBbm() {
      this.hitungSimulasi();
    },
    tipeInput() {
      this.inputUser = "";
      this.hasil = {};
    },
  },
}).mount("#app");
