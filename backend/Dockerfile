FROM python:3.11

WORKDIR /app

COPY requirements.txt .

# Atualiza o pip antes de qualquer coisa para evitar conflito de wheels
RUN pip install --no-cache-dir --upgrade pip

# Instala todas as bibliotecas
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
