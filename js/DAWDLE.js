"use strict";

const API_URL = "https://random-word-api.herokuapp.com/word";
const CLAVE_HISTORIAL = "dawdle-historial";
const MAX_HISTORIAL = 10;

const FILAS_TECLADO = [
    ["Á", "É", "Í", "Ó", "Ú"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"]
];

// Elementos del DOM
const $ = (selector) => document.querySelector(selector);
const principal = $("#PRINCIPAL");
const juego = $("#juego");
const historial = $("#historial");
const tablero = $(".wordle-cajas");
const teclado = $(".teclado-container");
const mensaje = $("#mensaje");

// Estado de la partida
let partida = null;

/* ---------- Utilidades ---------- */

// Quita tildes pero conserva la Ñ
const normalizar = (texto) =>
    texto.toUpperCase().replace(/Ñ/g, "#").normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "").replace(/#/g, "Ñ");

const mostrar = (pantalla) => {
    [principal, juego, historial].forEach((p) => p.classList.add("oculto"));
    pantalla.classList.remove("oculto");
};

const cajasDeFila = (n) => tablero.children[n].querySelectorAll(".casilla");

/* ---------- Construcción de la interfaz ---------- */

const crearTablero = (intentos, letras) => {
    tablero.innerHTML = "";
    tablero.style.setProperty("--letras", letras);
    for (let i = 0; i < intentos; i++) {
        const fila = document.createElement("div");
        fila.classList.add("fila-wordle");
        for (let j = 0; j < letras; j++) {
            const casilla = document.createElement("div");
            casilla.classList.add("casilla");
            fila.appendChild(casilla);
        }
        tablero.appendChild(fila);
    }
};

const crearTeclado = () => {
    teclado.innerHTML = "";
    FILAS_TECLADO.forEach((letras) => {
        const fila = document.createElement("div");
        fila.classList.add("teclado-fila");
        letras.forEach((letra) => {
            const boton = document.createElement("button");
            boton.type = "button";
            boton.classList.add("tecla");
            boton.dataset.tecla = letra;
            boton.textContent = letra === "ENTER" ? "Enter" : letra;
            if (letra === "ENTER" || letra === "DEL") boton.classList.add("tecla-accion");
            boton.addEventListener("click", () => procesarTecla(letra));
            fila.appendChild(boton);
        });
        teclado.appendChild(fila);
    });
};

/* ---------- Lógica del juego ---------- */

// Devuelve un array con "ok" | "existe" | "no" por cada letra del intento
const evaluar = (intento, secreta) => {
    const resultado = Array(intento.length).fill("no");
    const restantes = {};

    // 1ª pasada: letras bien colocadas
    [...secreta].forEach((letra, i) => {
        if (intento[i] === letra) resultado[i] = "ok";
        else restantes[letra] = (restantes[letra] || 0) + 1;
    });
    // 2ª pasada: letras presentes en otra posición (respetando repeticiones)
    [...intento].forEach((letra, i) => {
        if (resultado[i] !== "ok" && restantes[letra] > 0) {
            resultado[i] = "existe";
            restantes[letra]--;
        }
    });
    return resultado;
};

const pintarTecla = (letra, clase) => {
    const tecla = teclado.querySelector(`[data-tecla="${letra}"]`);
    if (!tecla || tecla.classList.contains("ok")) return;
    if (tecla.classList.contains("existe") && clase === "no") return;
    tecla.classList.remove("existe", "no");
    tecla.classList.add(clase);
};

const escribirLetra = (letra) => {
    if (partida.actual.length >= partida.letras) return;
    partida.actual.push(letra);
    cajasDeFila(partida.fila)[partida.actual.length - 1].textContent = letra;
};

const borrarLetra = () => {
    if (partida.actual.length === 0) return;
    partida.actual.pop();
    cajasDeFila(partida.fila)[partida.actual.length].textContent = "";
};

const comprobarIntento = () => {
    if (partida.actual.length < partida.letras) return;

    const intento = partida.actual.join("");
    const clases = evaluar(intento, partida.secreta);

    cajasDeFila(partida.fila).forEach((caja, i) => {
        caja.classList.add(clases[i]);
        pintarTecla(intento[i], clases[i]);
    });

    partida.intentos.push(intento);
    partida.fila++;
    partida.actual = [];

    if (intento === partida.secreta) terminarPartida(true);
    else if (partida.fila === partida.maxIntentos) terminarPartida(false);
};

// Punto único de entrada para teclado real y virtual
const procesarTecla = (tecla) => {
    if (!partida || partida.terminada) return;
    if (tecla === "ENTER") comprobarIntento();
    else if (tecla === "DEL") borrarLetra();
    else escribirLetra(normalizar(tecla));
};

const teclaFisica = (event) => {
    const mapa = { Enter: "ENTER", Backspace: "DEL", Delete: "DEL" };
    if (mapa[event.key]) procesarTecla(mapa[event.key]);
    else if (/^[a-zA-ZñÑ]$/.test(event.key)) procesarTecla(event.key);
};

/* ---------- localStorage ---------- */

const leerHistorial = () => JSON.parse(localStorage.getItem(CLAVE_HISTORIAL)) || [];

const guardarPartida = (gano) => {
    const lista = leerHistorial();
    lista.push({
        palabra: partida.secreta,
        intentos: partida.intentos,
        fecha: new Date().toISOString(),
        resultado: gano ? "ganada" : "perdida"
    });
    localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(lista.slice(-MAX_HISTORIAL)));
};

const mostrarHistorial = (gano) => {
    $("#titulo-final").textContent = gano
        ? "¡Has ganado!"
        : `Has perdido. La palabra era ${partida.secreta}`;

    const lista = $("#lista-partidas");
    lista.innerHTML = "";
    leerHistorial().reverse().forEach((p) => {
        const li = document.createElement("li");
        li.classList.add(p.resultado);
        li.textContent = `${new Date(p.fecha).toLocaleString("es-ES")} · ${p.palabra} · ` +
                         `${p.resultado.toUpperCase()} · intentos: ${p.intentos.join(", ")}`;
        lista.appendChild(li);
    });
    mostrar(historial);
};

const terminarPartida = (gano) => {
    partida.terminada = true;
    guardarPartida(gano);
    // Pequeña pausa para ver los colores del último intento
    setTimeout(() => mostrarHistorial(gano), 1200);
};

/* ---------- Inicio ---------- */

const obtenerPalabra = async (letras) => {
    const respuesta = await fetch(`${API_URL}?length=${letras}&lang=es`);
    if (!respuesta.ok) throw new Error("Error en la API");
    const datos = await respuesta.json();
    return normalizar(datos[0]);
};

const iniciarJuego = async () => {
    const maxIntentos = parseInt($("#intentos").value);
    const letras = parseInt($("#letras").value);
    mensaje.textContent = "";

    try {
        const secreta = await obtenerPalabra(letras);
        console.log("Palabra secreta:", secreta);
        partida = { secreta, letras, maxIntentos, fila: 0, actual: [], intentos: [], terminada: false };
    } catch (error) {
        mensaje.textContent = "No se pudo obtener una palabra. Inténtalo de nuevo.";
        return;
    }

    crearTablero(maxIntentos, letras);
    crearTeclado();
    mostrar(juego);
};

document.addEventListener("DOMContentLoaded", () => {
    $("#JUGAR").addEventListener("click", iniciarJuego);
    $("#REINICIAR").addEventListener("click", () => mostrar(principal));
    document.addEventListener("keydown", teclaFisica);
});
