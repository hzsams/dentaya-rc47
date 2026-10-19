
---
language:
  - en
  - ga
tags:
- translation
license: cc-by-4.0
inference: false
---

<img src="https://hplt-project.org/_next/static/media/logo-hplt.d5e16ca5.svg" width=12.5%>

### HPLT MT release v2.0

This repository contains the English-Irish (en->ga) encoder-decoder translation model trained on HPLT v2.0 and OPUS parallel data. The model is currently available in Marian format and we are working on converting it to the Hugging Face format.

### Model Info

* Source language: English
* Target language: Irish
* Data: HPLT v2.0 and OPUS parallel data
* Model architecture: Transformer-base
* Tokenizer: SentencePiece (Unigram)

You can check out our [paper](https://arxiv.org/abs/2503.10267), [GitHub repository](https://github.com/hplt-project/HPLT-MT-Models/tree/main/v2.0), or [website](https://hplt-project.org) for more details.

### Usage
The model has been trained with [MarianNMT](https://github.com/marian-nmt/marian) and the weights are in the Marian format. 

#### Using Marian
To run inference with MarianNMT, refer to the [Inference/Decoding/Translation](https://github.com/hplt-project/HPLT-MT-Models/tree/main/v1.0#inferencedecodingtranslation) section of our GitHub repository. You will need the model file `model.npz.best-chrf.npz` and the vocabulary file `model.en-ga.spm` from this repository.

#### Using transformers
We are working on this.

### Acknowledgements

This project has received funding from the European Union's Horizon Europe research and innovation programme under grant agreement No 101070350 and from UK Research and Innovation (UKRI) under the UK government's Horizon Europe funding guarantee [grant number 10052546]


### Citation

If you find this model useful, please cite the following paper:
```bibtex
@article{hpltv2,
    title={An Expanded Massive Multilingual Dataset for High-Performance Language Technologies}, 
    author={Laurie Burchell and Ona de Gibert and Nikolay Arefyev and Mikko Aulamo and Marta Bañón and Pinzhen Chen and Mariia Fedorova and Liane Guillou and Barry Haddow and Jan Hajič and Jindřich Helcl and Erik Henriksson and Mateusz Klimaszewski and Ville Komulainen and Andrey Kutuzov and Joona Kytöniemi and Veronika Laippala and Petter Mæhlum and Bhavitvya Malik and Farrokh Mehryary and Vladislav Mikhailov and Nikita Moghe and Amanda Myntti and Dayyán O'Brien and Stephan Oepen and Proyag Pal and Jousia Piha and Sampo Pyysalo and Gema Ramírez-Sánchez and David Samuel and Pavel Stepachev and Jörg Tiedemann and Dušan Variš and Tereza Vojtěchová and Jaume Zaragoza-Bernabeu},
    journal={arXiv preprint arXiv:2503.10267},
    year={2025},
    url={https://arxiv.org/abs/2503.10267}, 
}
```

